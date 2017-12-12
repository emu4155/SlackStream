#! /bin/bash
rm -rf slack-stream-*

yarn build

mv dist/3rdpartylicenses.txt .

mkdir package
cp -r dist electron package.json package
mkdir package/icons
cp icons/ss.png package/icons/ss.png

electron-packager package slack-stream --platform=darwin --icon=icons/ss.icns --arch=all --overwrite
electron-packager package slack-stream --platform=win32 --icon=icons/ss.ico --arch=all --overwrite
electron-packager package slack-stream --platform=linux --arch=ia32,x64 --overwrite

for f in slack-stream*
do
    cp 3rdpartylicenses.txt $f/LICENSES.3rdParty
done

for f in slack-stream-darwin*
do
    mv $f `echo $f | sed "s/darwin/mac/g"`
done

n_cores=`grep processor /proc/cpuinfo | wc -l`
echo "Creating zips using ${n_cores} processes"
parallel -j ${n_cores} zip {}.zip -r {} > /dev/null ::: `find -maxdepth 1 -name "slack-stream-*"`

rm -f 3rdpartylicenses.txt
rm -rf package
