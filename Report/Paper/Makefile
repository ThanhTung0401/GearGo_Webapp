MAIN = main
TEXMK = latexmk -xelatex -interaction=nonstopmode -file-line-error

.PHONY: all clean watch view

all:
	$(TEXMK) $(MAIN).tex

watch:
	$(TEXMK) -pvc $(MAIN).tex

view:
	xdg-open $(MAIN).pdf 2>/dev/null || open $(MAIN).pdf 2>/dev/null || true

clean:
	latexmk -C
	rm -f *.aux *.bbl *.blg *.log *.out *.toc *.lof *.lot *.fls *.fdb_latexmk *.synctex.gz chapters/*.aux
