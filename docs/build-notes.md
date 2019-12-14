# camo-banano-light-wallet

    macOS:
    openssl dgst -sha256 &lt;App.dmg>

    Windows:
    certUtil -hashfile "&lt;App.exe>" SHA256

    Linux AppImage:
    sha256sum &lt;App.AppImage>

# To build a release:

    npm run dist-mac;
    npm run dist-win;
    npm run dist-linux;
