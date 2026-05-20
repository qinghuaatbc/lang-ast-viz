package handler

import (
	"encoding/json"
	"go/ast"
	"go/parser"
	"go/token"
	"io"
	"net/http"
	"regexp"
	"strings"
)

type chipParseRequest struct {
	Code string `json:"code"`
	Lang string `json:"lang"`
}

type ChipInfo struct {
	Name    string   `json:"name"`
	Methods []string `json:"methods"`
	Fields  []string `json:"fields"`
}

type CallEdge struct {
	From     string `json:"from"`
	To       string `json:"to"`
	Method   string `json:"method"`
	Params   string `json:"params"`
	Ret      string `json:"ret"`
	Relation string `json:"relation"`
}

type ChipParseResult struct {
	Chips []ChipInfo `json:"chips"`
	Calls []CallEdge `json:"calls"`
	Lang  string     `json:"lang"`
}

func (h *Handler) handleCodeChipParse(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		jsonError(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	r.Body = http.MaxBytesReader(w, r.Body, maxBodySize)
	body, err := io.ReadAll(r.Body)
	if err != nil {
		jsonError(w, "request too large", http.StatusRequestEntityTooLarge)
		return
	}
	defer r.Body.Close()

	var req chipParseRequest
	if err := json.Unmarshal(body, &req); err != nil {
		jsonError(w, "invalid json", http.StatusBadRequest)
		return
	}

	var result ChipParseResult
	switch strings.ToLower(req.Lang) {
	case "go":
		result = parseGo(req.Code)
	case "python", "py":
		result = parsePython(req.Code)
	case "java":
		result = parseJava(req.Code)
	case "cpp", "c++", "cc":
		result = parseCpp(req.Code)
	case "typescript", "ts":
		result = parseTypeScript(req.Code)
	default:
		result = detectAndParse(req.Code)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

/* ── Go: stdlib go/ast ──────────────────────────────────────── */

func parseGo(code string) ChipParseResult {
	fset := token.NewFileSet()
	f, err := parser.ParseFile(fset, "", code, parser.AllErrors)

	chipMap := map[string]*ChipInfo{}
	var calls []CallEdge

	if err != nil && f == nil {
		return ChipParseResult{Lang: "go"}
	}

	// First pass: collect type declarations
	for _, decl := range f.Decls {
		switch d := decl.(type) {
		case *ast.GenDecl:
			if d.Tok == token.TYPE {
				for _, spec := range d.Specs {
					ts := spec.(*ast.TypeSpec)
					name := ts.Name.Name
					chip := &ChipInfo{Name: name}
					switch t := ts.Type.(type) {
					case *ast.StructType:
						if t.Fields != nil {
							for _, field := range t.Fields.List {
								fieldType := exprString(field.Type)
								if len(field.Names) == 0 {
									// embedded field = composition/inherit
									chip.Fields = append(chip.Fields, fieldType)
									calls = append(calls, CallEdge{
										From: name, To: fieldType,
										Method: "embeds", Relation: "compose",
									})
								} else {
									for _, n := range field.Names {
										chip.Fields = append(chip.Fields, n.Name+":"+fieldType)
										// pointer to another struct = aggregation
										if isTypeName(field.Type) {
											calls = append(calls, CallEdge{
												From: name, To: fieldType,
												Method: "has", Relation: "aggregate",
											})
										}
									}
								}
							}
						}
					case *ast.InterfaceType:
						if t.Methods != nil {
							for _, m := range t.Methods.List {
								if len(m.Names) > 0 {
									chip.Methods = append(chip.Methods, m.Names[0].Name)
								} else {
									// embedded interface = inherit
									embedded := exprString(m.Type)
									calls = append(calls, CallEdge{
										From: name, To: embedded,
										Method: "extends", Relation: "inherit",
									})
								}
							}
						}
					}
					chipMap[name] = chip
				}
			}
		}
	}

	// Second pass: collect method declarations and call edges
	for _, decl := range f.Decls {
		if fn, ok := decl.(*ast.FuncDecl); ok {
			receiverType := ""
			if fn.Recv != nil && len(fn.Recv.List) > 0 {
				receiverType = exprString(fn.Recv.List[0].Type)
				receiverType = strings.TrimPrefix(receiverType, "*")
				if chip, exists := chipMap[receiverType]; exists {
					chip.Methods = append(chip.Methods, fn.Name.Name)
				}
			}

			// Walk body for call expressions
			if fn.Body != nil {
				caller := receiverType
				if caller == "" {
					caller = fn.Name.Name
				}
				ast.Inspect(fn.Body, func(n ast.Node) bool {
					call, ok := n.(*ast.CallExpr)
					if !ok {
						return true
					}
					switch sel := call.Fun.(type) {
					case *ast.SelectorExpr:
						callee := exprString(sel.X)
						method := sel.Sel.Name
						params := callArgsString(call.Args)
						calls = append(calls, CallEdge{
							From: caller, To: callee,
							Method: method, Params: params,
							Relation: "call",
						})
					}
					return true
				})
			}
		}
	}

	chips := make([]ChipInfo, 0, len(chipMap))
	for _, c := range chipMap {
		chips = append(chips, *c)
	}
	return ChipParseResult{Chips: chips, Calls: deduplicateCalls(calls), Lang: "go"}
}

func exprString(e ast.Expr) string {
	if e == nil {
		return ""
	}
	switch t := e.(type) {
	case *ast.Ident:
		return t.Name
	case *ast.StarExpr:
		return exprString(t.X)
	case *ast.SelectorExpr:
		return exprString(t.X) + "." + t.Sel.Name
	case *ast.ArrayType:
		return "[]" + exprString(t.Elt)
	case *ast.MapType:
		return "map[" + exprString(t.Key) + "]" + exprString(t.Value)
	case *ast.InterfaceType:
		return "interface{}"
	}
	return ""
}

func isTypeName(e ast.Expr) bool {
	switch e.(type) {
	case *ast.Ident, *ast.StarExpr, *ast.SelectorExpr:
		return true
	}
	return false
}

func callArgsString(args []ast.Expr) string {
	parts := make([]string, len(args))
	for i, a := range args {
		parts[i] = exprString(a)
	}
	return strings.Join(parts, ", ")
}

/* ── Python ─────────────────────────────────────────────────── */

var (
	pyClass  = regexp.MustCompile(`(?m)^class\s+(\w+)\s*(?:\(([^)]*)\))?:`)
	pyDef    = regexp.MustCompile(`(?m)^\s{4}def\s+(\w+)\s*\(([^)]*)\)`)
	pyCall   = regexp.MustCompile(`(?m)self\.(\w+)\.(\w+)\(([^)]*)\)`)
	pyInit   = regexp.MustCompile(`(?m)self\.(\w+)\s*=\s*(\w+)\(`)
	pyReturn = regexp.MustCompile(`(?m)->\s*(\w+)`)
)

func parsePython(code string) ChipParseResult {
	var chips []ChipInfo
	var calls []CallEdge

	classes := pyClass.FindAllStringSubmatchIndex(code, -1)
	for i, m := range classes {
		name := code[m[2]:m[3]]
		chip := ChipInfo{Name: name}

		// inheritance
		if m[4] >= 0 {
			parents := strings.Split(strings.TrimSpace(code[m[4]:m[5]]), ",")
			for _, p := range parents {
				p = strings.TrimSpace(p)
				if p != "" && p != "object" {
					calls = append(calls, CallEdge{From: name, To: p, Method: "extends", Relation: "inherit"})
				}
			}
		}

		// class body boundary
		end := len(code)
		if i+1 < len(classes) {
			end = classes[i+1][0]
		}
		body := code[m[0]:end]

		// methods
		for _, dm := range pyDef.FindAllStringSubmatch(body, -1) {
			if dm[1] != "__init__" {
				chip.Methods = append(chip.Methods, dm[1])
			}
		}

		// composition via self.x = X()
		for _, im := range pyInit.FindAllStringSubmatch(body, -1) {
			field, typ := im[1], im[2]
			chip.Fields = append(chip.Fields, field+":"+typ)
			calls = append(calls, CallEdge{From: name, To: typ, Method: "has", Relation: "compose"})
		}

		// method calls via self.x.method()
		for _, cm := range pyCall.FindAllStringSubmatch(body, -1) {
			calls = append(calls, CallEdge{From: name, To: cm[1], Method: cm[2], Params: cm[3], Relation: "call"})
		}

		chips = append(chips, chip)
	}

	return ChipParseResult{Chips: chips, Calls: deduplicateCalls(calls), Lang: "python"}
}

/* ── Java ───────────────────────────────────────────────────── */

var (
	javaClass   = regexp.MustCompile(`(?m)(class|interface)\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?`)
	javaMethod  = regexp.MustCompile(`(?m)(?:public|private|protected|static|\s)+[\w<>\[\]]+\s+(\w+)\s*\(([^)]*)\)`)
	javaField   = regexp.MustCompile(`(?m)(?:private|protected|public)\s+(\w+)\s+(\w+)\s*[;=]`)
	javaCall    = regexp.MustCompile(`(?m)(\w+)\.(\w+)\(([^)]*)\)`)
	javaNew     = regexp.MustCompile(`(?m)new\s+(\w+)\(`)
)

func parseJava(code string) ChipParseResult {
	var chips []ChipInfo
	var calls []CallEdge

	classes := javaClass.FindAllStringSubmatchIndex(code, -1)
	for i, m := range classes {
		kind := code[m[2]:m[3]]
		name := code[m[4]:m[5]]
		chip := ChipInfo{Name: name}

		if m[6] >= 0 {
			parent := code[m[6]:m[7]]
			rel := "inherit"
			if kind == "interface" {
				rel = "inherit"
			}
			calls = append(calls, CallEdge{From: name, To: parent, Method: "extends", Relation: rel})
		}
		if m[8] >= 0 {
			for _, iface := range strings.Split(code[m[8]:m[9]], ",") {
				iface = strings.TrimSpace(iface)
				if iface != "" {
					calls = append(calls, CallEdge{From: name, To: iface, Method: "implements", Relation: "depend"})
				}
			}
		}

		end := len(code)
		if i+1 < len(classes) {
			end = classes[i+1][0]
		}
		body := code[m[0]:end]

		for _, mm := range javaMethod.FindAllStringSubmatch(body, -1) {
			mname := mm[1]
			if mname != name && mname != "main" {
				chip.Methods = append(chip.Methods, mname)
			}
		}
		for _, fm := range javaField.FindAllStringSubmatch(body, -1) {
			typ, fname := fm[1], fm[2]
			chip.Fields = append(chip.Fields, fname+":"+typ)
		}
		for _, nm := range javaNew.FindAllStringSubmatch(body, -1) {
			calls = append(calls, CallEdge{From: name, To: nm[1], Method: "new", Relation: "compose"})
		}
		for _, cm := range javaCall.FindAllStringSubmatch(body, -1) {
			if cm[1] != "System" && cm[1] != "super" && cm[1] != "this" {
				calls = append(calls, CallEdge{From: name, To: cm[1], Method: cm[2], Params: cm[3], Relation: "call"})
			}
		}

		chips = append(chips, chip)
	}

	return ChipParseResult{Chips: chips, Calls: deduplicateCalls(calls), Lang: "java"}
}

/* ── C++ ────────────────────────────────────────────────────── */

var (
	cppClass   = regexp.MustCompile(`(?m)(?:class|struct)\s+(\w+)(?:\s*:\s*(?:public|private|protected)?\s*([\w,\s:]+?))?(?:\s*\{)`)
	cppMethod  = regexp.MustCompile(`(?m)(?:virtual\s+|static\s+|inline\s+)?[\w:*&<>]+\s+(\w+)\s*\(([^)]*)\)(?:\s*(?:const|override|final))*\s*(?:\{|;)`)
	cppScope   = regexp.MustCompile(`(?m)(\w+)::(\w+)\s*\(`)
	cppCall    = regexp.MustCompile(`(?m)(\w+)\.(\w+)\(([^)]*)\)|(\w+)->(\w+)\(([^)]*)\)`)
	cppNew     = regexp.MustCompile(`(?m)new\s+(\w+)\s*[({]`)
)

func parseCpp(code string) ChipParseResult {
	var chips []ChipInfo
	var calls []CallEdge

	classes := cppClass.FindAllStringSubmatchIndex(code, -1)
	for i, m := range classes {
		name := code[m[2]:m[3]]
		chip := ChipInfo{Name: name}

		if m[4] >= 0 {
			for _, parent := range strings.Split(code[m[4]:m[5]], ",") {
				parent = strings.TrimSpace(parent)
				for _, kw := range []string{"public ", "private ", "protected "} {
					parent = strings.TrimPrefix(parent, kw)
				}
				if parent != "" {
					calls = append(calls, CallEdge{From: name, To: parent, Method: "extends", Relation: "inherit"})
				}
			}
		}

		end := len(code)
		if i+1 < len(classes) {
			end = classes[i+1][0]
		}
		body := code[m[0]:end]

		for _, mm := range cppMethod.FindAllStringSubmatch(body, -1) {
			mname := mm[1]
			if mname != name && !strings.Contains("if for while switch return", mname) {
				chip.Methods = append(chip.Methods, mname)
			}
		}
		for _, nm := range cppNew.FindAllStringSubmatch(body, -1) {
			calls = append(calls, CallEdge{From: name, To: nm[1], Method: "new", Relation: "compose"})
		}
		for _, cm := range cppCall.FindAllStringSubmatch(body, -1) {
			obj, method, params := cm[1], cm[2], cm[3]
			if obj == "" {
				obj, method, params = cm[4], cm[5], cm[6]
			}
			if obj != "" && method != "" {
				calls = append(calls, CallEdge{From: name, To: obj, Method: method, Params: params, Relation: "call"})
			}
		}
		_ = cppScope

		chips = append(chips, chip)
	}

	return ChipParseResult{Chips: chips, Calls: deduplicateCalls(calls), Lang: "cpp"}
}

/* ── TypeScript ─────────────────────────────────────────────── */

var (
	tsClass    = regexp.MustCompile(`(?m)(?:class|interface)\s+(\w+)(?:<[^>]*>)?(?:\s+extends\s+([\w,\s<>]+?))?(?:\s+implements\s+([\w,\s<>]+?))?(?:\s*\{)`)
	tsMethod   = regexp.MustCompile(`(?m)(?:public|private|protected|async|static|\s)*(\w+)\s*\(([^)]*)\)\s*(?::\s*\S+)?\s*\{`)
	tsField    = regexp.MustCompile(`(?m)(?:public|private|protected|readonly|\s)+(\w+)\s*(?::\s*(\w+))?\s*[=;]`)
	tsCall     = regexp.MustCompile(`(?m)(?:this\.)?(\w+)\.(\w+)\(([^)]*)\)`)
	tsNew      = regexp.MustCompile(`(?m)new\s+(\w+)\s*[(<]`)
)

func parseTypeScript(code string) ChipParseResult {
	var chips []ChipInfo
	var calls []CallEdge

	classes := tsClass.FindAllStringSubmatchIndex(code, -1)
	for i, m := range classes {
		name := code[m[2]:m[3]]
		chip := ChipInfo{Name: name}

		if m[4] >= 0 {
			for _, p := range strings.Split(code[m[4]:m[5]], ",") {
				p = strings.TrimSpace(p)
				if idx := strings.Index(p, "<"); idx >= 0 {
					p = p[:idx]
				}
				if p != "" {
					calls = append(calls, CallEdge{From: name, To: p, Method: "extends", Relation: "inherit"})
				}
			}
		}
		if m[6] >= 0 {
			for _, p := range strings.Split(code[m[6]:m[7]], ",") {
				p = strings.TrimSpace(p)
				if idx := strings.Index(p, "<"); idx >= 0 {
					p = p[:idx]
				}
				if p != "" {
					calls = append(calls, CallEdge{From: name, To: p, Method: "implements", Relation: "depend"})
				}
			}
		}

		end := len(code)
		if i+1 < len(classes) {
			end = classes[i+1][0]
		}
		body := code[m[0]:end]

		for _, mm := range tsMethod.FindAllStringSubmatch(body, -1) {
			mname := mm[1]
			if mname != "if" && mname != "for" && mname != "while" && mname != "constructor" {
				chip.Methods = append(chip.Methods, mname)
			}
		}
		for _, fm := range tsField.FindAllStringSubmatch(body, -1) {
			if fm[2] != "" {
				chip.Fields = append(chip.Fields, fm[1]+":"+fm[2])
			}
		}
		for _, nm := range tsNew.FindAllStringSubmatch(body, -1) {
			calls = append(calls, CallEdge{From: name, To: nm[1], Method: "new", Relation: "compose"})
		}
		for _, cm := range tsCall.FindAllStringSubmatch(body, -1) {
			if cm[1] != "console" && cm[1] != "Math" && cm[1] != "JSON" {
				calls = append(calls, CallEdge{From: name, To: cm[1], Method: cm[2], Params: cm[3], Relation: "call"})
			}
		}

		chips = append(chips, chip)
	}

	return ChipParseResult{Chips: chips, Calls: deduplicateCalls(calls), Lang: "typescript"}
}

/* ── Auto-detect language ───────────────────────────────────── */

func detectAndParse(code string) ChipParseResult {
	switch {
	case strings.Contains(code, "func ") && strings.Contains(code, "package "):
		return parseGo(code)
	case strings.Contains(code, "def ") && strings.Contains(code, "self"):
		return parsePython(code)
	case strings.Contains(code, "public class") || strings.Contains(code, "import java"):
		return parseJava(code)
	case strings.Contains(code, "#include") || strings.Contains(code, "std::"):
		return parseCpp(code)
	case strings.Contains(code, "interface ") || strings.Contains(code, ": string") || strings.Contains(code, ": number"):
		return parseTypeScript(code)
	default:
		return parsePython(code)
	}
}

/* ── Helpers ────────────────────────────────────────────────── */

func deduplicateCalls(calls []CallEdge) []CallEdge {
	seen := map[string]bool{}
	out := calls[:0]
	for _, c := range calls {
		key := c.From + "|" + c.To + "|" + c.Method + "|" + c.Relation
		if !seen[key] {
			seen[key] = true
			out = append(out, c)
		}
	}
	if out == nil {
		return []CallEdge{}
	}
	return out
}
