all: life.js work.js life.css

test:
	./bin/test

pack: life.tar.gz

life.tar.gz: all
	ln -s . life
	tar -zcvf life.tar.gz \
		life/README \
    life/Makefile \
		life/bin \
		life/tests \
		life/lib \
		life/*.main.ts \
		life/*.main.scss \
		life/*.js \
		life/*.css \
		life/index.html \
		life/img/rand0.svg \
		life/img/rand1.svg \
		life/img/cube.png \
		life/img/cube.psd
	rm life

run:
	./bin/http

node_modules/typescript/bin/tsc:
	npm install

%.js : %.main.ts lib/*.ts node_modules/typescript/bin/tsc
	./node_modules/typescript/bin/tsc --out $@ --removeComments $<

%.css : %.main.scss
	sass --no-cache --style=compressed $< $@

clean:
	rm -rf life.js life.css work.js life.tar.gz out
