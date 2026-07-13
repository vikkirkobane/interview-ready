call npx tsc --noEmit > tsc_output.txt 2>&1
call npx eslint . > eslint_output.txt 2>&1
call npx expo prebuild --clean > prebuild_output.txt 2>&1
echo Done > done.txt
