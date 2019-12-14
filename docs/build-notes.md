# camo-banano-light-wallet

    macOS:
    openssl dgst -sha256 [App.dmg]

    Windows:
    certUtil -hashfile "[App.exe]" SHA256

    Linux AppImage:
    sha256sum [App.AppImage]

# To build a release:

    npm run dist-mac;
    npm run dist-win;
    npm run dist-linux;
