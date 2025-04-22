# Automating Github CI workflow for SSL certificates

This document describes a common security-vs-CI problem: you need private certificates to build the image, but you don't want to store them in the repo. Next we will describe a step by step on how to handle this issue.

## Recommended: Use GitHub Actions Secrets + Base64 Encoding

1. Base64-encode your certs locally:

```sh
base64 -i ./certs/example_com.pem -o pem.b64
base64 -i ./certs/example_com.key -o key.b64
```

2. Add these base64 strings as GitHub Secrets: `SSL_CERT_PEM` and `SSL_CERT_KEY`

3. In Github, go to your repo → Settings → Secrets and variables → Actions → New repository secret

4. In your GitHub Actions workflow, recreate the certs at runtime before building the Docker image:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Recreate SSL certs
        run: |
          mkdir -p certs
          echo "${{ secrets.SSL_CERT_PEM }}" | base64 -d > certs/example_com.pem
          echo "${{ secrets.SSL_CERT_KEY }}" | base64 -d > certs/example_com.key

      - name: Build Docker image
        run: |
          docker build -t your-image-name .

      - name: Push Docker image
        run: |
          echo "${{ secrets.DOCKER_PASSWORD }}" | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
          docker push your-image-name
```

### Pros:

- Certificates are never stored in the repo.
- CI build works fully automated.
- Works even in public repos.

### Cons:

- You need to handle the base64 encoding and decoding.
- You need to handle the certificate recreation in the workflow.

## Conclusion

I recommend using the recommended method for handling SSL certificates in CI/CD workflows. It provides a secure and automated way to handle certificates without storing them in the repository.
