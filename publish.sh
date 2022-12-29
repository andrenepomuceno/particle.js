#!/bin/sh

git checkout -b release_v$1 $2 && git push origin release_v$1 $2 && git checkout dev