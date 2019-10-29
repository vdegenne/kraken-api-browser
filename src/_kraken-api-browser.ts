// const crypto = require('crypto-browserify')
// const qs = require('qs')
// import crypto from 'crypto-browserify'

// import qs from 'qs'
// import {Buffer} from 'buffer'
// import createHmac from 'create-hmac'

// Public/Private method names
const methods = {
  public: ['Time', 'Assets', 'AssetPairs', 'Ticker', 'Depth', 'Trades', 'Spread', 'OHLC'],
  private: [
    'Balance',
    'TradeBalance',
    'OpenOrders',
    'ClosedOrders',
    'QueryOrders',
    'TradesHistory',
    'QueryTrades',
    'OpenPositions',
    'Ledgers',
    'QueryLedgers',
    'TradeVolume',
    'AddOrder',
    'CancelOrder',
    'DepositMethods',
    'DepositAddresses',
    'DepositStatus',
    'WithdrawInfo',
    'Withdraw',
    'WithdrawStatus',
    'WithdrawCancel'
  ]
}

// Default options
const defaults = {
  url: 'https://api.kraken.com',
  version: 0,
  timeout: 5000
}


const stringifyParams = (params:any) => Object.entries(params).map(p => p.join('=')).join('&')


const bufferToString = (buf:ArrayBuffer) => {
  // @ts-ignore
  return String.fromCharCode.apply(null, new Uint8Array(buf));
}
const stringToBuffer = (str:string) => {
  var bufView = new Uint8Array(str.length);
  for (var i=0, strLen=str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return bufView;
}
const createSha256Hash = async (message:string) => {
  const encoder = new TextEncoder()
  const data = encoder.encode(message)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(hash)
}
const createSha512Hmac = async (privateKey: ArrayBuffer, message:string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    privateKey,
    {
      name: 'HMAC',
      hash: { name: 'SHA-512' }
    },
    true,
    ['sign', 'verify']
  )
  return await crypto.subtle.sign('HMAC', key, stringToBuffer(message))
}

const changeStringEncoding = (text:string, encoding:string = 'utf8') => {
  const decoder = new TextDecoder(encoding)
  return decoder.decode(stringToBuffer(text))
}


/* Create a signature for a request */
const getMessageSignature = async (path:string, request:string, secret:string, nonce:number) => {
  // sha256
  const postData = stringifyParams(request)
  const sha256 = bufferToString(await createSha256Hash(nonce + postData))
  // base64 decoded key buffer
  const secretBuffer = stringToBuffer(atob(secret))
  // message to sign
  const message = changeStringEncoding(path + sha256, 'latin1')
  const hmac = await createSha512Hmac(secretBuffer, message)

  return btoa(bufferToString(hmac))
}

// Send an API request
const rawRequest = async (url:string, headers:any, data:any, timeout:number) => {
  // Set custom User-Agent string
  headers['User-Agent'] = 'Kraken Javascript API Client'

  const options = { headers, timeout }

  Object.assign(options, {
    method: 'POST',
    body: stringifyParams(data)
  })

  const response = await fetch(url, options)
  const body = await response.json()

  if (body.error && body.error.length) {
    const error = body.error.filter((e:string) => e.startsWith('E')).map((e:string) => e.substr(1))

    if (!error.length) {
      throw new Error('Kraken API returned an unknown error')
    }

    throw new Error(error.join(', '))
  }

  return body
}

export declare type KrakenOptions = {
  url?:string
  version?:number
  timeout?:number
  otp?:string
  key?:string
  secret?:string
}

/**
 * KrakenClient connects to the Kraken.com API
 * @param {String}        key               API Key
 * @param {String}        secret            API Secret
 * @param {String|Object} [options={}]      Additional options. If a string is passed, will default to just setting `options.otp`.
 * @param {String}        [options.otp]     Two-factor password (optional) (also, doesn't work)
 * @param {Number}        [options.timeout] Maximum timeout (in milliseconds) for all API-calls (passed to `request`)
 */
class KrakenClient {

  protected config: KrakenOptions

  constructor(key:string, secret:string, options?:KrakenOptions) {
    // Allow passing the OTP as the third argument for backwards compatibility
    if (typeof options === 'string') {
      options = { otp: options }
    }

    this.config = Object.assign({ key, secret }, defaults, options)
  }

  /**
	 * This method makes a public or private API request.
	 * @param  {String}   method   The API method (public or private)
	 * @param  {Object}   params   Arguments to pass to the api call
	 * @param  {Function} callback A callback function to be executed when the request is complete
	 * @return {Object}            The request object
	 */
  async api(method:string, params?:any, callback?:Function) {
    // Default params to empty object
    if (typeof params === 'function') {
      callback = params
      params = {}
    }

    if (methods.public.includes(method)) {
      return await this.publicMethod(method, params, callback)
    } else if (methods.private.includes(method)) {
      return await this.privateMethod(method, params, callback)
    } else {
      throw new Error(method + ' is not a valid API method.')
    }
  }

  /**
	 * This method makes a public API request.
	 * @param  {String}   method   The API method (public or private)
	 * @param  {Object}   params   Arguments to pass to the api call
	 * @param  {Function} callback A callback function to be executed when the request is complete
	 * @return {Object}            The request object
	 */
  async publicMethod(method:string, params?:any, callback?:Function) {
    params = params || {}

    // Default params to empty object
    if (typeof params === 'function') {
      callback = params
      params = {}
    }

    const path = '/' + this.config.version + '/public/' + method
    const url = this.config.url + path
    const response = rawRequest(url, {
      'Content-Type': 'application/x-www-form-urlencoded'
    }, params, <number>this.config.timeout)

    if (callback !== undefined && typeof callback === 'function') {
      response.then(result => (callback as Function)(null, result)).catch(error => (callback as Function)(error, null))
    }

    return response
  }

  /**
	 * This method makes a private API request.
	 * @param  {String}   method   The API method (public or private)
	 * @param  {Object}   params   Arguments to pass to the api call
	 * @param  {Function} callback A callback function to be executed when the request is complete
	 * @return {Object}            The request object
	 */
  async privateMethod(method:string, params?:any, callback?:Function) {
    params = params || {}

    // Default params to empty object
    if (typeof params === 'function') {
      callback = params
      params = {}
    }

    const path = '/' + this.config.version + '/private/' + method
    const url = this.config.url + path

    if (!params.nonce) {
      params.nonce = (+new Date()) * 1000 // spoof microsecond
    }

    if (this.config.otp !== undefined) {
      params.otp = this.config.otp
    }

    const signature = await getMessageSignature(path, params, <string>this.config.secret, params.nonce)
    console.log(signature)
    
    const headers = {
      'API-Key': this.config.key,
      'API-Sign': signature,
      'Content-Type': 'application/x-www-form-urlencoded'
    }

    const response = rawRequest(url, headers, params, <number>this.config.timeout)

    if (callback !== undefined && typeof callback === 'function') {
      response.then(result => (callback as Function)(null, result)).catch(error => (callback as Function)(error, null))
    }

    return response
  }
}

// @ts-ignore
window.KrakenClient = KrakenClient

export { KrakenClient }
