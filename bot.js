const puppeteer = require('puppeteer')
const AWS = require('aws-sdk')

AWS.config.update({region: 'us-east-1'})

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

function sendSMS(message, phone) {
	return new AWS.SNS({apiVersion: '2010-03-31'}).publish({
		Message: message,
		PhoneNumber: phone
	}).promise()
}

(async() => {
	const browser = await puppeteer.launch({
		headless: true,
		product: 'firefox'
		//args: ['--no-sandbox','--disable-setuid-sandbox']
	})
	const page = await browser.newPage()
	await page.goto('https://www.cvs.com/immunizations/covid-19-vaccine')
	await page.addScriptTag({url: 'https://code.jquery.com/jquery-3.3.1.slim.min.js'})
	let available = []
	while (true) {
		await page.click('a[data-analytics-name="' + process.env.state + '"]')
		await page.waitForSelector('.modal__content')
		let availableNew = await page.evaluate(() => {
			return $('span.status').filter(function() {
				return $(this).text() === "Available"
			}).parents('tr').find('span.city').map(function(){
				return $.trim($(this).text())
			}).get()
		})
		for (let city of availableNew) {
			if (!available.includes(city)) {
				let message = [
					'Appointments Available:',
					availableNew.join('\n'),
					'https://www.cvs.com/immunizations/covid-19-vaccine'
				].join('\n')
				sendSMS(message, process.env.phone)
				break
			}
		}
		available = availableNew
		await page.click('.modal__close')
		await sleep(600000)
	}
})()