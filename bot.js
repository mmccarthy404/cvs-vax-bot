const puppeteer = require('puppeteer')
const AWS = require('aws-sdk')

AWS.config.update({region: 'us-east-1'});

phone = process.env.phone
state = process.env.state

var sms_params = {
	Message: 'Appointments Available: https://www.cvs.com/immunizations/covid-19-vaccine',
	PhoneNumber: phone
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

function sendSMS() {
	return new AWS.SNS({apiVersion: '2010-03-31'}).publish(sms_params).promise()
}

(async () => {
	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox','--disable-setuid-sandbox']
	})
	const page = await browser.newPage()
	await page.goto('https://www.cvs.com/immunizations/covid-19-vaccine')
	while (true) {
		await page.waitForSelector('a[data-analytics-name="' + state + '"]')
		await page.click('a[data-analytics-name="' + state + '"]')
		await page.waitForSelector('.modal__content')
		let isAvailable = await page.evaluate(() => {
			return document.querySelector('span').innerText.includes('Available')
		})
		if (isAvailable) {
			await sendSMS()
			break
		} else {
			await page.click('.modal__close')
		}
		await sleep(600000)
	}
})()