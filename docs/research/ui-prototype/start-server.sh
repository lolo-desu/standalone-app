#!/bin/bash
fuser -k 18787/tcp
nohup npx serve -l 18787 -s dist > serve.log 2>&1 &
