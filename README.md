# kraken-api-browser

`kraken-api-browser` is a browser port of the server-side kraken API [`kraken-api`](https://github.com/nothingisdead/npm-kraken-api).


## Installation

`npm i kraken-api-browser`

## Usage

```html
<script href="/node_modules/kraken-api-browser/kraken-api-browser.js">
<script>
  window.onload = async () => {
    const kraken = new KrakenClient('api key', 'private key') // replace with your keys

    // example (request your bitcoin balance)
    const response = await kraken.api('Balance')
    console.log(response.result.XXBT)

    // ...
  }
</script>
```