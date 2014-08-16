fun! s:CheckForJonquil()
    if getline(1) =~# '\v^#lang imperative'
        set filetype=ruthefjord-imperative
    endif
endfun
au BufNewFile,BufRead *.txt call s:CheckForJonquil()
