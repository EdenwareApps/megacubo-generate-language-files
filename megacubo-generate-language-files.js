const fs = require('fs'), async = require('async'), decodeEntities = require('decode-entities')
const translate = require('@vitalets/google-translate-api')

const sourceLanguage = 'en'
const sourceFile = 'lang/'+ sourceLanguage +'.json'

const newTargetLanguages = {
    'el': 'Ελληνικά',
    'fr': 'Français',
    'de': 'Deutsch',
    'sq': 'Shqip'
}
// NOTE: In the values of newTargetLanguages, put the language name in the referred language. E.g.: en=English, es=Español, it=Italiano, pt=Português...

String.prototype.replaceAll = function(search, replacement) {
    var target = this;
    if(target.indexOf(search)!=-1){
        target = target.split(search).join(replacement);
    }
    return String(target);
}   

function _print(str){
    if(str.charAt(str.length - 1) != "\n"){
        str += ' '.repeat(24)
    } else {
        str = str.substr(0, str.length - 1) + ' '.repeat(24) + "\n"
    }
    process.stderr.write(str)
}

function applyCommonFixes(txt){
    txt = txt.replace(new RegExp(' +\\.{3}', 'g'), '...')
    return txt
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

function sortObject(o) {
    return Object.keys(o).sort().reduce((r, k) => (r[k] = o[k], r), {})
}

let errorLimit = 10, errorCount = 0
fs.readFile(sourceFile, async (err, data) => {
    if(err) throw err
    let json = JSON.parse(String(data))
    for(const newTargetLanguage in newTargetLanguages){
        let targetFile = 'lang/'+ newTargetLanguage +'.json'
        let stat = fs.existsSync(targetFile) ? fs.statSync(targetFile) : null
        if(!stat || !stat.size){
            let p = "\r\rTranslating to "+ newTargetLanguages[newTargetLanguage] +' ('+ newTargetLanguage +'):'
            let njson = {}, n = 0, m = Object.keys(json).length
            for(const k in json){
                _print(p +' '+ n +'/'+ m)
                while(!njson[k] && errorCount < errorLimit){
                    if(k == 'LANGUAGE_NAME') continue
                    let res = await translate(decodeEntities(json[k]), {from: sourceLanguage, to: newTargetLanguage}).catch(console.error)
                    if(res){
                        njson[k] = applyCommonFixes(res.text)
                    } else {
                        errorCount++
                        await sleep(errorCount * 1000)
                    }
                }
                n++
            }
            njson['LANGUAGE_NAME'] = newTargetLanguages[newTargetLanguage]
            fs.writeFile(targetFile, JSON.stringify(njson, null, 3), () => {})
            _print("\r\rLang \""+ newTargetLanguage +"\" is ready.\n")
        }
    }
    for(const file of fs.readdirSync('lang')){
        let targetFile = 'lang/'+ file
        let targetLanguage = file.replace('.json', '')
        if(targetLanguage == sourceLanguage) continue
        let njson = fs.readFileSync(targetFile)
        try {
            njson = JSON.parse(njson)
        } catch(e) {
            console.error('ERROR AT '+ targetFile +' '+ String(e))
            njson = false
        }
        if(njson){
            let p = "\r\rTranslating to "+ njson['LANGUAGE_NAME'] +' ('+ targetLanguage +'):'
            let n = 1, m = Object.keys(json).length
            for(const k of Object.keys(json)){
                _print(p +' '+ n +'/'+ m)
                n++
                if(njson[k]){
                    continue
                } else if(k == 'LANGUAGE_NAME') {
                    console.error('ERROR AT '+ targetFile +' NO LANGUAGE NAME')
                } else {
                    while(!njson[k] && errorCount < errorLimit){
                        let res = await translate(decodeEntities(json[k]), {from: sourceLanguage, to: targetLanguage}).catch(console.error)
                        if(res){
                            njson[k] = applyCommonFixes(res.text)
                        } else {
                            errorCount++
                            await sleep(errorCount * 1000)
                        }
                    }
                }
            }
            fs.writeFile(targetFile, JSON.stringify(sortObject(njson), null, 3), () => {})
            _print("\r\rLang \""+ targetLanguage +"\" is ready.\n")
        } else {
            _print("\r\rBad JSON \""+ targetFile +"\".\n")
        }
    }
    console.log('Hooray, it\'s all ready! Now check manually the file(s) to improve it.')
})
