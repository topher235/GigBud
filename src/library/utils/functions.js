import CryptoJS from 'react-native-crypto-js';
import { SecureStore } from 'expo';
import constants from 'library/utils/constants';

// Formats a string so that is in the format of a url
export function UrlFormat(b) {
    var a = arguments;
    return b.replace(/(\{\{\d\}\}|\{\d\})/g, function (b) {
        if (b.substring(0, 2) == "{{") return b;
        var c = parseInt(b.match(/\d/)[0]);
        return a[c + 1]
    })
};

// Encodes a string to base64
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
export function EncodeBase64(input:string = '') {
    let str = input;
    let output = '';

    for (let block = 0, charCode, i = 0, map = chars;
    str.charAt(i | 0) || (map = '=', i % 1);
    output += map.charAt(63 & block >> 8 - i % 1 * 8)) {

      charCode = str.charCodeAt(i += 3/4);

      if (charCode > 0xFF) {
        throw new Error("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
      }

      block = block << 8 | charCode;
    }

    return output;
};

// Decodes a base64 string
export function DecodeBase64(input:string = '') {
    let str = input.replace(/=+$/, '');
    let output = '';

    if (str.length % 4 == 1) {
      throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
    }
    for (let bc = 0, bs = 0, buffer, i = 0;
      buffer = str.charAt(i++);

      ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
        bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0
    ) {
      buffer = chars.indexOf(buffer);
    }

    return output;
};

// Generates a JWT token
async function GetJWT() {
    var url = 'https://us-central1-gigbud-81332.cloudfunctions.net/getJWT';
    return fetch(url, {
        method: 'GET'
    })
    .then((response) => {
        // json looks like: {token: jwtToken, iat: date_now}
        return response.json();
    })
    // .then((responseJson) => {
    //     var tok = responseJson.token;
    //     console.log(tok);
    //     // fetch('https://api.music.apple.com/v1/catalog/us/songs/203709340', {
    //     //     method: 'GET',
    //     //     headers: {
    //     //         'Authorization': 'Bearer ' + tok
    //     //     }
    //     // })
    //     // .then((res) => console.log(res))
    //     // .then((resJson) => )
    //     return tok;
    // })
};

// Returns artists that appeared at a venue on a given date
async function GetOtherArtists(date, venueId) {
    let api_key = await SecureStore.getItemAsync(constants.local_setlist_fm);
    let url = 'https://api.setlist.fm/rest/1.0/search/setlists?' +
                'date=' + date +
                '&p=1' +
                '&venueId=' + venueId;
    return fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'x-api-key': api_key
        }
    })
    .then((response) => {
        return Promise.all([response.status, response.json()]);
    });
}

export {
    GetJWT,
    GetOtherArtists
}
