require("dotenv").config();

const BOT_API       = process.env.BOT_API;

const { Telegraf } = require('telegraf')

const bot = new Telegraf(BOT_API)

const fetch = require('node-fetch')
const FormData = require('form-data')
const toArray = require('stream-to-array')

function unescapeHtml(str) {
    const map = {
        amp: '&',
        lt: '<',
        le: '≤',
        gt: '>',
        ge: '≥',
        quot: '"',
        '#039': '\''
    };
    return str.replace(/&([^;]+);/g, (m, c) => map[c] || '');
}

const uploadByBuffer = (buffer, contentType, agent) => {
    const form = new FormData()

    form.append('photo', buffer, {
        filename: 'blob',
        contentType,
        ...agent && {agent},
    })

    return fetch('https://telegra.ph/upload', {
        method: 'POST',
        body: form
    })
        .then(result => result.json())
        .then((result) => {
            if (result.error) {
                throw result.error
            }

            if (result[0] && result[0].src) {
                return {
                    link: 'https://telegra.ph' + result[0].src,
                    path: result[0].src,
                }
            }

            throw new Error('Unknown error')
        })
}

const upload = (url, agent) => {
    return fetch(url)
        .then(async (r) => {
            const array = await toArray(r.body)
            const buffer = Buffer.concat(array)

            if (!r.headers.get('content-type')) {
                throw new Error('içerik yok')
            }

            return uploadByBuffer(buffer, r.headers.get('content-type'), agent)
        })
}

bot.on('photo', async (ctx, next) => {
    const files = ctx.update.message.photo;
    const fileId = files[1].file_id;
    await ctx.telegram.getFileLink(fileId).then(url => {
        upload(url)
            .then(async (result) => {
                await ctx.replyWithHTML(`<a href="${result.link}">​</a>${unescapeHtml(ctx.message.caption)}`)
            })
    })

    return next();
});

bot.launch()
