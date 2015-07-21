
paper: dragon-architect-vlhcc-2015.bib dragon-architect-vlhcc-2015.tex
	pdflatex dragon-architect-vlhcc-2015.tex
	bibtex dragon-architect-vlhcc-2015
	pdflatex dragon-architect-vlhcc-2015.tex
	pdflatex dragon-architect-vlhcc-2015.tex

clean:
	rm -f dragon-architect-vlhcc-2015.pdf *.log *.aux *.bbl *.blg *.out

openwin: paper
	explorer.exe dragon-architect-vlhcc-2015.pdf

openmac: paper
	open dragon-architect-vlhcc-2015.pdf