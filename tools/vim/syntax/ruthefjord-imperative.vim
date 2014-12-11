" Vim syntax file
" Language: Last Hour for a Flower scripting language

if exists("b:current_syntax")
    finish
endif

syntax keyword ruthefjordIControl repeat times pass
syntax keyword ruthefjordICommand command query
syntax keyword ruthefjordIBoolean true false
syntax match ruthefjordIAttribute "@\w\+="
syntax match ruthefjordIProcDef "define\s\+\w*"
syntax match ruthefjordIFuncDef "function\s\+\w*"
syntax match ruthefjordIOperator "("
syntax match ruthefjordIOperator ")"
syntax match ruthefjordIOperator ","
syntax match ruthefjordIComment "#.*$"

highlight link ruthefjordIControl Keyword
highlight link ruthefjordICommand Macro
highlight link ruthefjordIProcDef Function
highlight link ruthefjordIFuncDef Function
highlight link ruthefjordIBoolean Boolean
highlight link ruthefjordIOperator Operator
highlight link ruthefjordIComment Comment
highlight link ruthefjordIAttribute Macro


let b:current_syntax = "ruthefjord-imperative"

