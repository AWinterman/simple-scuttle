PANDOC:=pandoc --normalize --smart --write=html5 --read=markdown --standalone -c style.css  --section-divs -V title:scuttlebutt --template ./template.html

BROWSERIFY:=browserify -d main.js

html/index.html: index.md html/bundle.js html/style.css 
	echo '<script type="text/javascript" src="./bundle.js" async></script>' > html/bundle.html
	$(PANDOC) --include-in-header=html/bundle.html index.md > html/index.html
	rm html/bundle.html

html/bundle.js: main.js Demo.js
	$(BROWSERIFY) -o html/bundle.js

html/style.css: style.css star.svg
	cp style.css html/style.css
	cp star.svg html/star.svg

clean: 
	rm html/*
