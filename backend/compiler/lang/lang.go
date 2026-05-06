package lang

type Lang int

const (
	Rust   Lang = iota // let, braces, semicolons (original)
	GoLang            // var, braces, semicolons
	Python            // no keyword, indentation, no semicolons
	TypeScript        // let/const, braces, semicolons
	CLang             // int, braces, semicolons
)

func (l Lang) String() string {
	switch l {
	case Rust:
		return "Rust"
	case GoLang:
		return "Go"
	case Python:
		return "Python"
	case TypeScript:
		return "TypeScript"
	case CLang:
		return "C"
	default:
		return "Unknown"
	}
}

func Parse(s string) Lang {
	switch s {
	case "go":
		return GoLang
	case "python":
		return Python
	case "typescript":
		return TypeScript
	case "c":
		return CLang
	default:
		return Rust
	}
}

type Config struct {
	Lang             Lang
	DeclKeyword      string
	RequireSemicolon bool
	UseBraces        bool
	PrintFuncStyle   bool
}

func GetConfig(l Lang) Config {
	switch l {
	case Rust:
		return Config{Lang: Rust, DeclKeyword: "let", RequireSemicolon: true, UseBraces: true, PrintFuncStyle: false}
	case GoLang:
		return Config{Lang: GoLang, DeclKeyword: "var", RequireSemicolon: true, UseBraces: true, PrintFuncStyle: false}
	case Python:
		return Config{Lang: Python, DeclKeyword: "", RequireSemicolon: false, UseBraces: false, PrintFuncStyle: true}
	case TypeScript:
		return Config{Lang: TypeScript, DeclKeyword: "let", RequireSemicolon: true, UseBraces: true, PrintFuncStyle: false}
	case CLang:
		return Config{Lang: CLang, DeclKeyword: "int", RequireSemicolon: true, UseBraces: true, PrintFuncStyle: false}
	}
	return Config{Lang: Rust, DeclKeyword: "let", RequireSemicolon: true, UseBraces: true, PrintFuncStyle: false}
}
