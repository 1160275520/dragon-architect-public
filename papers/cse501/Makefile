
paper: 501-final-report.bib 501-final-report.tex
	pdflatex 501-final-report.tex
	bibtex 501-final-report
	pdflatex 501-final-report.tex
	pdflatex 501-final-report.tex

clean:
	rm -f 501-final-report.pdf *.log *.aux *.bbl *.blg *.out


openwin: paper
	explorer.exe 501-final-report.pdf

