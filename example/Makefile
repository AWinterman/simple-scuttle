PANDOC:=pandoc --write=html5 --read=markdown --standalone -c style.css  --section-divs 

BROWSERIFY:=browserify -d main.js

html/index.html: index.md html/bundle.js html/style.css html/conflict.html
	echo '<script type="text/javascript" src="./bundle.js" async></script>' > html/bundle.html
	$(PANDOC) --include-in-header=html/bundle.html index.md > html/index.html
	rm html/bundle.html

html/conflict.html: resolving-conflicts.md
	$(PANDOC) resolving-conflicts.md > html/conflict.html

html/bundle.js: main.js Demo.js
	$(BROWSERIFY) -o html/bundle.js

html/style.css: style.css
	cp style.css html/style.css

clean: 
	rm html/*
