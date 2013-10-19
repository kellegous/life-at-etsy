all: life.js work.js life.css

test:
	./bin/test

run:
	./bin/http

%.js : %.main.ts lib/*.ts
	tsc --out $@ --removeComments $<

%.css : %.main.scss
	sass --no-cache $< $@

clean:
	rm -rf life.js work.js life.css out