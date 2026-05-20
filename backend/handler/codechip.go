package handler

import (
	"encoding/json"
	"fmt"
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
	Methods []string `json:"methods,omitempty"`
	Fields  []string `json:"fields,omitempty"`
}

type CallEdge struct {
	From     string `json:"from"`
	To       string `json:"to"`
	Method   string `json:"method"`
	Params   string `json:"params"`
	Ret      string `json:"ret"`
	Relation string `json:"relation"`
}

type GenASTNode struct {
	Type     string       `json:"type"`
	Value    string       `json:"value,omitempty"`
	Line     int          `json:"line,omitempty"`
	Children []GenASTNode `json:"children,omitempty"`
}

type AsmInstr struct {
	Addr     string            `json:"addr"`
	Bytes    string            `json:"bytes"`
	Mnemonic string            `json:"mnemonic"`
	Operands string            `json:"operands"`
	Comment  string            `json:"comment,omitempty"`
	Regs     map[string]string `json:"regs,omitempty"`
	Mem      []AsmMemSlot      `json:"mem,omitempty"`
	IsCall   bool              `json:"isCall,omitempty"`
	IsRet    bool              `json:"isRet,omitempty"`
}

type AsmMemSlot struct {
	Addr  string `json:"addr"`
	Value string `json:"value"`
	Label string `json:"label,omitempty"`
}

type ChipParseResult struct {
	Chips []ChipInfo  `json:"chips"`
	Calls []CallEdge  `json:"calls"`
	AST   *GenASTNode `json:"ast,omitempty"`
	Asm   []AsmInstr  `json:"asm,omitempty"`
	Lang  string      `json:"lang"`
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

// /api/parse — unified endpoint used by AST tab
func (h *Handler) handleParse(w http.ResponseWriter, r *http.Request) {
	h.handleCodeChipParse(w, r)
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
	tree := goFileToGenAST(fset, f)
	deduped := deduplicateCalls(calls)
	return ChipParseResult{Chips: chips, Calls: deduped, AST: &tree, Asm: generateAsm(deduped, chips), Lang: "go"}
}

/* ── Go AST → GenASTNode tree ───────────────────────────────── */

func goFileToGenAST(fset *token.FileSet, f *ast.File) GenASTNode {
	root := GenASTNode{Type: "File", Value: f.Name.Name}
	for _, decl := range f.Decls {
		root.Children = append(root.Children, goNodeToGen(fset, decl))
	}
	return root
}

func goNodeToGen(fset *token.FileSet, node ast.Node) GenASTNode {
	if node == nil {
		return GenASTNode{Type: "nil"}
	}
	pos := fset.Position(node.Pos())
	line := pos.Line

	switch n := node.(type) {
	case *ast.FuncDecl:
		g := GenASTNode{Type: "FuncDecl", Value: n.Name.Name, Line: line}
		if n.Recv != nil {
			recv := GenASTNode{Type: "Receiver"}
			for _, f := range n.Recv.List {
				recv.Children = append(recv.Children, GenASTNode{Type: "Field", Value: exprString(f.Type)})
			}
			g.Children = append(g.Children, recv)
		}
		if n.Type.Params != nil {
			params := GenASTNode{Type: "Params"}
			for _, f := range n.Type.Params.List {
				for _, nm := range f.Names {
					params.Children = append(params.Children, GenASTNode{Type: "Param", Value: nm.Name + " " + exprString(f.Type)})
				}
			}
			g.Children = append(g.Children, params)
		}
		if n.Type.Results != nil {
			results := GenASTNode{Type: "Returns"}
			for _, f := range n.Type.Results.List {
				results.Children = append(results.Children, GenASTNode{Type: "Return", Value: exprString(f.Type)})
			}
			g.Children = append(g.Children, results)
		}
		if n.Body != nil {
			g.Children = append(g.Children, goNodeToGen(fset, n.Body))
		}
		return g

	case *ast.GenDecl:
		g := GenASTNode{Type: n.Tok.String(), Line: line}
		for _, spec := range n.Specs {
			g.Children = append(g.Children, goNodeToGen(fset, spec))
		}
		return g

	case *ast.TypeSpec:
		g := GenASTNode{Type: "TypeSpec", Value: n.Name.Name, Line: line}
		g.Children = append(g.Children, goNodeToGen(fset, n.Type))
		return g

	case *ast.StructType:
		g := GenASTNode{Type: "Struct"}
		if n.Fields != nil {
			for _, f := range n.Fields.List {
				if len(f.Names) == 0 {
					g.Children = append(g.Children, GenASTNode{Type: "Embed", Value: exprString(f.Type)})
				} else {
					for _, nm := range f.Names {
						g.Children = append(g.Children, GenASTNode{Type: "Field", Value: nm.Name + " " + exprString(f.Type)})
					}
				}
			}
		}
		return g

	case *ast.InterfaceType:
		g := GenASTNode{Type: "Interface"}
		if n.Methods != nil {
			for _, m := range n.Methods.List {
				if len(m.Names) > 0 {
					g.Children = append(g.Children, GenASTNode{Type: "Method", Value: m.Names[0].Name})
				} else {
					g.Children = append(g.Children, GenASTNode{Type: "Embed", Value: exprString(m.Type)})
				}
			}
		}
		return g

	case *ast.BlockStmt:
		g := GenASTNode{Type: "Block", Line: line}
		for _, s := range n.List {
			g.Children = append(g.Children, goNodeToGen(fset, s))
		}
		return g

	case *ast.AssignStmt:
		g := GenASTNode{Type: "Assign", Value: n.Tok.String(), Line: line}
		for _, l := range n.Lhs {
			g.Children = append(g.Children, goNodeToGen(fset, l))
		}
		for _, r := range n.Rhs {
			g.Children = append(g.Children, goNodeToGen(fset, r))
		}
		return g

	case *ast.ExprStmt:
		return goNodeToGen(fset, n.X)

	case *ast.ReturnStmt:
		g := GenASTNode{Type: "Return", Line: line}
		for _, r := range n.Results {
			g.Children = append(g.Children, goNodeToGen(fset, r))
		}
		return g

	case *ast.IfStmt:
		g := GenASTNode{Type: "If", Line: line}
		g.Children = append(g.Children, GenASTNode{Type: "Cond", Children: []GenASTNode{goNodeToGen(fset, n.Cond)}})
		g.Children = append(g.Children, goNodeToGen(fset, n.Body))
		if n.Else != nil {
			g.Children = append(g.Children, GenASTNode{Type: "Else", Children: []GenASTNode{goNodeToGen(fset, n.Else)}})
		}
		return g

	case *ast.ForStmt:
		g := GenASTNode{Type: "For", Line: line}
		if n.Cond != nil {
			g.Children = append(g.Children, GenASTNode{Type: "Cond", Children: []GenASTNode{goNodeToGen(fset, n.Cond)}})
		}
		g.Children = append(g.Children, goNodeToGen(fset, n.Body))
		return g

	case *ast.RangeStmt:
		g := GenASTNode{Type: "Range", Line: line}
		g.Children = append(g.Children, GenASTNode{Type: "Over", Children: []GenASTNode{goNodeToGen(fset, n.X)}})
		g.Children = append(g.Children, goNodeToGen(fset, n.Body))
		return g

	case *ast.CallExpr:
		g := GenASTNode{Type: "Call", Value: exprString(n.Fun), Line: line}
		for _, arg := range n.Args {
			g.Children = append(g.Children, goNodeToGen(fset, arg))
		}
		return g

	case *ast.SelectorExpr:
		return GenASTNode{Type: "Selector", Value: exprString(n.X) + "." + n.Sel.Name, Line: line}

	case *ast.BinaryExpr:
		g := GenASTNode{Type: "BinaryExpr", Value: n.Op.String(), Line: line}
		g.Children = append(g.Children, goNodeToGen(fset, n.X))
		g.Children = append(g.Children, goNodeToGen(fset, n.Y))
		return g

	case *ast.Ident:
		return GenASTNode{Type: "Ident", Value: n.Name, Line: line}

	case *ast.BasicLit:
		return GenASTNode{Type: n.Kind.String(), Value: n.Value, Line: line}

	case *ast.ValueSpec:
		g := GenASTNode{Type: "Var", Line: line}
		for _, nm := range n.Names {
			g.Children = append(g.Children, GenASTNode{Type: "Name", Value: nm.Name})
		}
		if n.Type != nil {
			g.Children = append(g.Children, GenASTNode{Type: "Type", Value: exprString(n.Type)})
		}
		return g

	case *ast.ImportSpec:
		v := ""
		if n.Path != nil {
			v = n.Path.Value
		}
		return GenASTNode{Type: "Import", Value: v, Line: line}

	case *ast.DeclStmt:
		return goNodeToGen(fset, n.Decl)

	case *ast.UnaryExpr:
		g := GenASTNode{Type: "UnaryExpr", Value: n.Op.String(), Line: line}
		g.Children = append(g.Children, goNodeToGen(fset, n.X))
		return g

	case *ast.CompositeLit:
		g := GenASTNode{Type: "CompositeLit", Value: exprString(n.Type), Line: line}
		for _, elt := range n.Elts {
			g.Children = append(g.Children, goNodeToGen(fset, elt))
		}
		return g

	default:
		return GenASTNode{Type: "Node", Line: line}
	}
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

	deduped := deduplicateCalls(calls)
	tree := chipsToAST("python", chips, deduped)
	return ChipParseResult{Chips: chips, Calls: deduped, AST: &tree, Asm: generateAsm(deduped, chips), Lang: "python"}
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

	deduped := deduplicateCalls(calls)
	tree := chipsToAST("java", chips, deduped)
	return ChipParseResult{Chips: chips, Calls: deduped, AST: &tree, Asm: generateAsm(deduped, chips), Lang: "java"}
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

	deduped := deduplicateCalls(calls)
	tree := chipsToAST("cpp", chips, deduped)
	return ChipParseResult{Chips: chips, Calls: deduped, AST: &tree, Asm: generateAsm(deduped, chips), Lang: "cpp"}
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

	deduped := deduplicateCalls(calls)
	tree := chipsToAST("typescript", chips, deduped)
	return ChipParseResult{Chips: chips, Calls: deduped, AST: &tree, Asm: generateAsm(deduped, chips), Lang: "typescript"}
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

/* ── Generic AST from chips+calls (non-Go languages) ────────── */

func chipsToAST(lang string, chips []ChipInfo, calls []CallEdge) GenASTNode {
	root := GenASTNode{Type: "Program", Value: lang}
	for _, chip := range chips {
		node := GenASTNode{Type: "Class", Value: chip.Name}
		// fields
		if len(chip.Fields) > 0 {
			fields := GenASTNode{Type: "Fields"}
			for _, f := range chip.Fields {
				fields.Children = append(fields.Children, GenASTNode{Type: "Field", Value: f})
			}
			node.Children = append(node.Children, fields)
		}
		// methods
		if len(chip.Methods) > 0 {
			methods := GenASTNode{Type: "Methods"}
			for _, m := range chip.Methods {
				methods.Children = append(methods.Children, GenASTNode{Type: "Method", Value: m})
			}
			node.Children = append(node.Children, methods)
		}
		// relations involving this chip
		rels := GenASTNode{Type: "Relations"}
		for _, c := range calls {
			if c.From == chip.Name {
				rels.Children = append(rels.Children, GenASTNode{
					Type:  c.Relation,
					Value: c.To + "." + c.Method,
				})
			}
		}
		if len(rels.Children) > 0 {
			node.Children = append(node.Children, rels)
		}
		root.Children = append(root.Children, node)
	}
	return root
}

/* ── Helpers ────────────────────────────────────────────────── */

/* ── x86-64 Assembly Generator ──────────────────────────────── */
// Simulates the AMD64 System V calling convention for the call chain.
// Produces educational (not exact) assembly with full register+stack state.

func generateAsm(calls []CallEdge, chips []ChipInfo) []AsmInstr {
	if len(calls) == 0 {
		return nil
	}
	const (
		stackBase = uint64(0x7fff_0000_0060) // initial RSP (stack grows down)
		codeBase  = uint64(0x0040_1000)      // .text segment
		heapBase  = uint64(0x0060_8000)      // heap: one contiguous block per object
	)

	// Build chip field lookup
	chipMap := map[string]ChipInfo{}
	for _, c := range chips {
		chipMap[c.Name] = c
	}

	// Collect unique object names in call order
	seenN := map[string]bool{}
	var names []string
	for _, c := range calls {
		for _, nm := range []string{c.From, c.To} {
			if !seenN[nm] {
				seenN[nm] = true
				names = append(names, nm)
			}
		}
	}

	// ── Heap layout: contiguous block per object ──────────────────
	// Each block: [vtable ptr][field0][field1]... aligned to 64-byte cache line
	type heapBlock struct {
		base   uint64
		nSlot  uint64   // actual slots to display (vtable + fields)
		fields []string // field names (already stripped of type suffix)
	}
	objBlocks := map[string]heapBlock{}
	heapOff := uint64(0)
	for _, nm := range names {
		ci := chipMap[nm]
		fieldNames := make([]string, 0, len(ci.Fields))
		for _, f := range ci.Fields {
			name := f
			if idx := strings.Index(f, ":"); idx >= 0 {
				name = f[:idx]
			}
			fieldNames = append(fieldNames, name)
		}
		if len(fieldNames) == 0 {
			fieldNames = []string{"data"} // at least one data slot
		}
		nSlot := uint64(1 + len(fieldNames)) // vtable + fields
		sz := (nSlot*8 + 63) &^ 63           // round up to 64B cache line
		objBlocks[nm] = heapBlock{base: heapBase + heapOff, nSlot: nSlot, fields: fieldNames}
		heapOff += sz
	}

	rsp, rbp := stackBase, stackBase
	codeOff := uint64(0)

	regs := map[string]string{
		"RAX": "0x0000000000000000", "RBX": "0x0000000000000000",
		"RCX": "0x0000000000000000", "RDX": "0x0000000000000000",
		"RSI": "0x0000000000000000", "RDI": "0x0000000000000000",
		"RSP": fmt.Sprintf("0x%016x", rsp), "RBP": fmt.Sprintf("0x%016x", rbp),
		"RIP": fmt.Sprintf("0x%08x", codeBase), "FLAGS": "ZF=0 SF=0 CF=0",
	}

	type slot struct{ v, l string }
	stack := map[uint64]slot{stackBase: {"<caller_ret>", "return addr"}}

	// Heap memory: addr → slot (pre-populated with zero values + field labels)
	heap := map[uint64]slot{}
	for _, nm := range names {
		blk := objBlocks[nm]
		heap[blk.base] = slot{"0x0000000000000000", nm + ".vtable"}
		for i, fname := range blk.fields {
			heap[blk.base+uint64(i+1)*8] = slot{"0x0000000000000000", nm + "." + fname}
		}
	}

	nameOff := map[string]uint64{} // positive offset below RBP (stack ptr slots)
	for i, nm := range names {
		nameOff[nm] = uint64(i+1) * 8
	}

	var instrs []AsmInstr

	snapR := func() map[string]string {
		r := make(map[string]string, len(regs))
		for k, v := range regs {
			r[k] = v
		}
		return r
	}

	// snapM: stack frame (RSP..stackBase) then heap object blocks
	snapM := func() []AsmMemSlot {
		out := make([]AsmMemSlot, 0, 32)
		for addr := rsp; addr <= stackBase; addr += 8 {
			s := stack[addr]
			v := s.v
			if v == "" {
				v = "—"
			}
			out = append(out, AsmMemSlot{Addr: fmt.Sprintf("0x%016x", addr), Value: v, Label: s.l})
		}
		for _, nm := range names {
			blk := objBlocks[nm]
			for i := uint64(0); i < blk.nSlot; i++ {
				addr := blk.base + i*8
				s := heap[addr]
				v := s.v
				if v == "" {
					v = "—"
				}
				out = append(out, AsmMemSlot{Addr: fmt.Sprintf("0x%016x", addr), Value: v, Label: s.l})
			}
		}
		return out
	}

	emit := func(bytesHex, mnem, ops, comment string, isCall, isRet bool) {
		nb := uint64(len(strings.Fields(bytesHex)))
		instr := AsmInstr{
			Addr:     fmt.Sprintf("0x%08x", codeBase+codeOff),
			Bytes:    bytesHex,
			Mnemonic: mnem, Operands: ops, Comment: comment,
			IsCall: isCall, IsRet: isRet,
		}
		codeOff += nb
		regs["RIP"] = fmt.Sprintf("0x%08x", codeBase+codeOff)
		instr.Regs = snapR()
		instr.Mem = snapM()
		instrs = append(instrs, instr)
	}

	// ── Prologue ─────────────────────────────────────────────────
	rsp -= 8
	stack[rsp] = slot{regs["RBP"], "saved RBP"}
	regs["RSP"] = fmt.Sprintf("0x%016x", rsp)
	emit("55", "PUSH", "RBP", "; save caller frame pointer", false, false)

	rbp = rsp
	regs["RBP"] = fmt.Sprintf("0x%016x", rbp)
	emit("48 89 E5", "MOV", "RBP, RSP", "; establish stack frame", false, false)

	frameBytes := ((uint64(len(names))*8 + 15) &^ 15)
	rsp -= frameBytes
	regs["RSP"] = fmt.Sprintf("0x%016x", rsp)
	for _, nm := range names {
		stack[rbp-nameOff[nm]] = slot{"nil", nm + "*"}
	}
	emit(fmt.Sprintf("48 83 EC %02X", frameBytes), "SUB",
		fmt.Sprintf("RSP, 0x%X", frameBytes),
		fmt.Sprintf("; reserve %d bytes for %d object pointers", frameBytes, len(names)), false, false)

	// ── Initialize locals: point stack slots at heap blocks ───────
	for i, nm := range names {
		off := nameOff[nm]
		blk := objBlocks[nm]
		addrStr := fmt.Sprintf("0x%016x", blk.base)
		regs["RAX"] = addrStr
		// vtable pointer = fake symbol in .rodata
		heap[blk.base] = slot{fmt.Sprintf("0x%08x", codeBase+0x2000+uint64(i)*0x10), nm + ".vtable"}
		stack[rbp-off] = slot{addrStr, nm + "*"}
		emit("48 8D 05 00 00 00 00", "LEA",
			fmt.Sprintf("RAX, [rip+%s]", nm),
			fmt.Sprintf("; RAX = &%s (heap 0x%x)", nm, blk.base), false, false)
		disp := byte(0x100 - off)
		emit(fmt.Sprintf("48 89 45 %02X", disp), "MOV",
			fmt.Sprintf("[RBP-0x%X], RAX", off),
			fmt.Sprintf("; %s* → 0x%016x (contiguous %d-byte block)", nm, blk.base, blk.nSlot*8), false, false)
	}

	// ── Call sequence ─────────────────────────────────────────────
	argRegs := [6]string{"RDI", "RSI", "RDX", "RCX", "R8", "R9"}
	for _, call := range calls {
		off, ok := nameOff[call.To]
		if !ok {
			continue
		}
		blk := objBlocks[call.To]

		// Load receiver pointer (heap base addr) into RDI
		regs["RDI"] = fmt.Sprintf("0x%016x", blk.base)
		disp := byte(0x100 - off)
		emit(fmt.Sprintf("48 8B 7D %02X", disp), "MOV",
			fmt.Sprintf("RDI, [RBP-0x%X]", off),
			fmt.Sprintf("; RDI = %s* (0x%x)", call.To, blk.base), false, false)

		// Load params into arg registers
		params := strings.Split(call.Params, ",")
		for j, param := range params {
			param = strings.TrimSpace(param)
			if param == "" || j+1 >= len(argRegs) {
				break
			}
			kv := strings.SplitN(param, "=", 2)
			pname, val := strings.TrimSpace(kv[0]), ""
			if len(kv) > 1 {
				val = strings.TrimSpace(kv[1])
			}
			reg := argRegs[j+1]
			regs[reg] = fmt.Sprintf("%q", val)
			leaOps := [5]string{"48 8D 35", "48 8D 15", "48 8D 0D", "48 8D 05", "4C 8D 05"}
			emit(fmt.Sprintf("%s 00 00 00 00", leaOps[j%5]), "LEA",
				fmt.Sprintf("%s, [rip+.str]", reg),
				fmt.Sprintf("; %s = %q", pname, val), false, false)
		}

		// CALL — push return address, simulate callee mutating first field
		retLabel := fmt.Sprintf("0x%08x", codeBase+codeOff+5)
		rsp -= 8
		stack[rsp] = slot{retLabel, "ret addr"}
		regs["RSP"] = fmt.Sprintf("0x%016x", rsp)
		if call.Ret != "" && call.Ret != "void" {
			regs["RAX"] = fmt.Sprintf("<ret: %s>", call.Ret)
		} else {
			regs["RAX"] = "0x0000000000000000"
		}
		// Simulate method write: mark first data field as modified
		if len(blk.fields) > 0 {
			fieldAddr := blk.base + 8
			heap[fieldAddr] = slot{
				fmt.Sprintf("<after .%s()>", call.Method),
				objBlocks[call.To].fields[0] + " (modified)",
			}
		}
		emit("E8 00 00 00 00", "CALL",
			fmt.Sprintf("%s.%s", call.To, call.Method),
			fmt.Sprintf("; %s → %s.%s(%s) : heap[0x%x]", call.From, call.To, call.Method, call.Ret, blk.base),
			true, false)
		delete(stack, rsp)
		rsp += 8
		regs["RSP"] = fmt.Sprintf("0x%016x", rsp)
		for _, r := range argRegs[1:4] {
			regs[r] = "0x0000000000000000"
		}
	}

	// ── Epilogue ──────────────────────────────────────────────────
	for _, nm := range names {
		delete(stack, rbp-nameOff[nm])
	}
	rsp += frameBytes
	regs["RSP"] = fmt.Sprintf("0x%016x", rsp)
	emit(fmt.Sprintf("48 83 C4 %02X", frameBytes), "ADD",
		fmt.Sprintf("RSP, 0x%X", frameBytes), "; release object pointer slots", false, false)

	savedRBP := stack[rsp]
	delete(stack, rsp)
	rsp += 8
	regs["RBP"] = savedRBP.v
	regs["RSP"] = fmt.Sprintf("0x%016x", rsp)
	emit("5D", "POP", "RBP", "; restore caller frame pointer", false, false)

	regs["RIP"] = "<caller>"
	emit("C3", "RET", "", "; return to caller", false, true)
	return instrs
}

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
