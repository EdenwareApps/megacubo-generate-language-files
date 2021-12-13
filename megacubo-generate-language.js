const fs = require('fs'), async = require('async'), decodeEntities = require('decode-entities')
const translate = require('@vitalets/google-translate-api')

const sourceFile = 'source.json'
const sourceLanguage = 'en'
const targetLanguages = {
    'el': 'Ελληνικά',
    'fr': 'Français',
    'de': 'Deutsch',
    'sq': 'Shqip'
}
// NOTE: In the values of targetLanguages, put the language name in the referred language. E.g.: en=English, es=Español, it=Italiano, pt=Português...

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    if(target.indexOf(search)!=-1){
        target = target.split(search).join(replacement);
    }
    return String(target);
}   

function applyCommonFixes(txt){
    txt = txt.replace(new RegExp(' +...', 'g'), '...')
    txt = txt.replace(new RegExp(' +...', 'g'), '...')
    return txt
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

let errorLimit = 10, errorCount = 0
fs.readFile(sourceFile, async (err, data) => {
    if(err) throw err
    let json = JSON.parse(String(data))
    for(const targetLanguage in targetLanguages){
        let p = "\r\rTranslating to "+ targetLanguages[targetLanguage] +' ('+ targetLanguage +'):'
        let njson = {}, n = 0, m = Object.keys(json).length
        for(const k in json){
            process.stderr.write(p +" "+ n +"/"+ m)
            while(!njson[k] && errorCount < errorLimit){
                if(k == 'LANGUAGE_NAME') continue
                let res = await translate(decodeEntities(json[k]), {from: sourceLanguage, to: targetLanguage}).catch(console.error)
                if(res){
                    njson[k] = applyCommonFixes(res.text)
                } else {
                    errorCount++
                    await sleep(errorCount * 1000)
                }
            }
            n++
        }
        njson['LANGUAGE_NAME'] = targetLanguages[targetLanguage]
        fs.writeFile(targetLanguage +'.json', JSON.stringify(njson, null, 3), () => {})
        process.stderr.write("\r\rLang \""+ targetLanguage +"\" is ready.\n")
    }
    console.log('Hooray, it\'s all ready! Now check manually the file(s) to improve it. Output: '+ targetLanguages.map(f => f +'.json').join(', '))
})
