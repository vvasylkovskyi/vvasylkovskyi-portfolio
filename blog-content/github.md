<!-- We need to make sure that our VPS has the github credentials saved and it will not request them again. Get your github repository, clone it and store the credentials as follows:

```sh
git config --global credential.helper store
git config --global credential.helper cache
git config --global credential.helper 'cache --timeout=6000000'
``` -->
