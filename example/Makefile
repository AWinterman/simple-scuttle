SHELL := /bin/bash
PANDOC:=pandoc --normalize --smart --write=html5+yaml_metadata_block+footnotes --read=markdown --standalone -c style.css  --section-divs -V title:scuttlebutt --template ./template.html
BROWSERIFY:=browserify -d js/index.js

html/index.html: index.md html/bundle.js html/style.css 
	echo '<script type="text/javascript" src="./bundle.js" async></script>' > html/bundle.html
	$(PANDOC) --include-in-header=html/bundle.html index.md > html/index.html
	rm html/bundle.html

html/bundle.js: js/* ../lib/gossip.js
	$(BROWSERIFY) -o html/bundle.js

html/style.css: style.css 
	cp style.css html/style.css

clean: 
	rm -rf html

install:
	@command -v node || echo "No node on you're path. Please install node and make sure it is on your \$PATH variable"
	@command -v pandoc || echo "No pandoc, Please install pandoc and make sure it is on your path"
	mkdir -p html
	npm install

publish: 
	./publish.sh
