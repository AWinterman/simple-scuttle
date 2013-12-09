#!/bin/bash -x
git stash
ORIGINALBRANCH=$(git branch | grep -F '*' | cut -d\  -f2-)

SHOULDCREATE=$(git branch | grep gh-pages)

test $SHOULDCREATE && git checkout gh-pages || git checkout --orphan gh-pages 

CURRENTBRANCH=$(git branch | grep -F '*' | cut -d\  -f2-)

test $ORIGINALBRANCH == $CURRENTBRANCH && echo "failed to switch branches" && exit 2

git rm -rf .
git checkout master html
git add html/*
git mv -f html/* .
git status
rm -r html
git commit -m "updated page"
git checkout $ORIGINALBRANCH
git stash pop
