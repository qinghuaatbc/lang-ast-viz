package pipeline

import (
	"context"

	"lang-ast-viz/asm"
	"lang-ast-viz/compiler"
	"lang-ast-viz/compiler/lang"
	"lang-ast-viz/optimizer"
	"lang-ast-viz/vm"
)

type CompileResult struct {
	AST          *compiler.Node          `json:"ast"`
	IR           []compiler.IRInstr      `json:"ir"`
	OptIR        []compiler.IRInstr      `json:"optIR,omitempty"`
	Assembly     []asm.AsmInstr          `json:"assembly"`
	OptAssembly  []asm.AsmInstr          `json:"optAssembly,omitempty"`
	Bytecode     []compiler.BytecodeInstr `json:"bytecode"`
	OptBytecode  []compiler.BytecodeInstr `json:"optBytecode,omitempty"`
	Output       []string                `json:"output"`
	Errors       []string                `json:"errors"`
	Language     string                  `json:"language"`
}

func Compile(source string) *CompileResult {
	return CompileWithLang(context.Background(), source, lang.GetConfig(lang.Rust))
}

func CompileWithLang(ctx context.Context, source string, cfg lang.Config) *CompileResult {
	res := &CompileResult{Language: cfg.Lang.String()}

	lex := compiler.NewLexerWithLang(source, cfg)
	parser := compiler.NewParser(lex)
	ast := parser.Parse()
	res.AST = ast

	if errs := parser.Errors(); len(errs) > 0 {
		res.Errors = errs
		return res
	}

	irGen := compiler.NewIRGen()
	res.IR = irGen.Gen(ast)

	// Constant folding optimization
	res.OptIR = optimizer.FoldConstants(res.IR)

	asmGen := asm.NewGenerator()
	res.Assembly = asmGen.Gen(res.IR)

	optAsmGen := asm.NewGenerator()
	res.OptAssembly = optAsmGen.Gen(res.OptIR)

	bcGen := compiler.NewBytecodeGen()
	res.Bytecode = bcGen.Gen(res.IR)

	optBcGen := compiler.NewBytecodeGen()
	res.OptBytecode = optBcGen.Gen(res.OptIR)

	v := vm.NewVM(res.OptBytecode)
	output, err := v.RunWithCtx(ctx)
	if err != nil {
		res.Errors = append(res.Errors, err.Error())
	} else {
		res.Output = output
	}

	return res
}
