const axios = require("axios")
const date = require('date-and-time')
const config = require('./config.js')
const store = require("store2")
const _ = require('underscore')
const async = require('async')

var enableClearStore = true

if (store.has('networkusage')) {
    var datausage = store.get('networkusage')
} else {
    var datausage = [0]
}

const si = require('systeminformation')

setInterval(function () {
    const now = new Date()
    if (date.format(now, 'DD') == '01') {
        // clear storage if start of month
        if (enableClearStore) {
            store.set('networkusage', [])
            enableClearStore = false
        }
    }
    if (date.format(now, 'DD') == '02') {
        enableClearStore = true
    }
    si.networkStats().then(data => {
        if (data[0]['operstate'] == 'up') {
            if (data[0]['tx_sec'] != 'null') {
                datausage.push(data[0]['rx_sec'])
                datausage.push(data[0]['tx_sec'])
                store.set('networkusage', datausage)
            }
        }
    })
}, 1000)

/////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////
//                                 AXIOS
///////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////

var hostname = config.dataserver
var rtuid = config.rtuid
var repeat = config.loopsec
repeat = parseInt(repeat * 1000)


function runPatientMonitor() {
    console.log('*******************************************')
    console.log('             PATIENT MONITOR               ')
    console.log('CLOG server : ' + hostname) //clog server address
    console.log('Interval : ' + config.loopsec) //interval time
    console.log('*******************************************')

    async.eachSeries(rtuid, function (id, next) {
            saveLog(id).then(getbusStop => { //find bus stop details
                next()
            }).catch(e => {
                console.log(e)
            })
        },
        function (err) {
            if (err) {
                console.log('ERROR : ' + err)
                return
            }
            setTimeout(function () {
                runPatientMonitor()
            }, repeat)
        })

}
runPatientMonitor()

function saveLog(id) {
    return new Promise(function (resolve, reject) {
        var Heartrate = _.random(60, 95)
        var BloodPressure = _.random(120, 129)
        var Oxygensaturation = _.random(95, 100)
        var DataTypes = {
            "heartrate": Heartrate,
            "blood": BloodPressure,
            "oxygen": Oxygensaturation,
        }
        var curr = {
            rtu_id: id,
            data: DataTypes,
        }

        axios.post('http://' + hostname + '/api/savedtlog', curr)
            .then(function (response) {
                datausage = []
                console.log('*******************************************')
                console.log("  RTU    : " + id)
                console.log("Recorded : Heart Rate " + Heartrate)
                console.log("Recorded : Blood Pressure " + BloodPressure)
                console.log("Recorded : Oxygen Saturation " + Oxygensaturation)
                console.log('*******************************************')
                resolve('ok')
            })
            .catch(function (error) {
                if (error.response) {
                    reject(error.response.data)
                }
            })
    })
}