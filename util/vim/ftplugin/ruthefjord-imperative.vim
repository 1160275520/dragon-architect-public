
setlocal foldlevel=2
setlocal foldmethod=expr
setlocal foldexpr=GetJonquilFold(v:lnum)

function! GetJonquilFold(lnum)
    if getline(a:lnum) =~? '\v##.*$'
        return '0'
    endif
    if getline(a:lnum) =~? '\v^\[.*\]$'
        return '>1'
    endif
    if getline(a:lnum + 1) =~? '\v^\[.*\]$'
        return '<1'
    endif
    if getline(a:lnum) =~? '\v^\s*$'
        return '-1'
    endif

    return '1'
endfunction

