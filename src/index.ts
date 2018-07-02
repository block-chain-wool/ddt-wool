
import * as puppeteer from 'puppeteer';
import * as util from 'util'
import * as fs from 'fs';
import * as path from 'path';
const ethCrypto = require( 'eth-crypto' );
import 'colors'

import { Browser, Page, ElementHandle } from 'puppeteer';

let browser: Browser = {} as Browser;

function generateEthAddress(): { address: string, publicKey: string, privateKey: string } {
    const res = ethCrypto.createIdentity();
    return {
        address: res.address.toLowerCase(),
        publicKey: res.publicKey,
        privateKey: res.privateKey
    };
}

async function sleep( time: number ): Promise<void> {
    return new Promise<void>( ( resolve ) => {
        setTimeout( resolve, time );
    } );
}

async function ready4Browser(): Promise<void> {
    browser = await puppeteer.launch( { headless: false } );
}

function storeEthAddress( address: string, publicKey: string, privateKey: string ): void {
    const listFilePath: string = path.join( __dirname, '../../list.json' );
    const listFile: string = fs.readFileSync( listFilePath, 'utf-8' );
    const list = JSON.parse( listFile );
    list.address[ address ] = { address, publicKey, privateKey };
    fs.writeFileSync( listFilePath, JSON.stringify( list, <any> '', 2 ) );
}

function storeVerifyCode( address: string, verifyCode: string, localStorageContent: string ): void {
    const listFilePath: string = path.join( __dirname, '../../list.json' );
    const listFile: string = fs.readFileSync( listFilePath, 'utf-8' );
    const list = JSON.parse( listFile );
    list.address[ address ].verifyCode = verifyCode;
    list.address[ address ].storageInfo = JSON.parse( localStorageContent );
    fs.writeFileSync( listFilePath, JSON.stringify( list, <any> '', 2 ) );
}

async function letUsPlay(): Promise<void> {
    const page: Page = await browser.newPage();

    while( true ) {
        await page.goto( 'https://token.air-drop.top/#/ddt/setup1/?invite=o92b8k2k&ref=4fbce5496ad47370' );
        await page.evaluate( () => {
            window.localStorage.clear();
        } );

        await page.reload();

        await page.waitForSelector( '#walletCode', {
            visible: true,
            timeout: 5 * 1000
        } );
        const { address, publicKey, privateKey } = generateEthAddress();
        storeEthAddress( address, publicKey, privateKey );
        console.log( `new user: [${ address }]` );

        const walletCode: ElementHandle|null = await page.$( '#walletCode' );
        if ( null === walletCode ) {
            throw new Error( 'can not get wallet input!' );
        }
        await walletCode.type( address );
        await sleep( 2 * 1000 );

        const submitBtn: ElementHandle|null = await page.$( '.page-setup-1-submit .com-btn' );
        if ( null === submitBtn ) {
            throw new Error( 'can not get submit button' );
        }
        await submitBtn.click();
        await page.waitForSelector( '.context .com-input', {
            visible: true,
            timeout: 5 * 1000
        } );
        const verifyCode: string|null = await page.evaluate( () => {
            const comInput: HTMLDivElement|null = document.querySelector( '.context .com-input' );
            if ( null === comInput ) {
                return null;
            }
            return comInput.innerHTML;
        } );
        if ( null === verifyCode ) {
            throw new Error( 'can not get verify code!' );
        }

        const localStorageContent: string = await page.evaluate( () => {
            return JSON.stringify( window.localStorage );
        } );

        console.log( `successully woolen new woll! address: [${ address }], verify code: [${ verifyCode }]`.green );
        storeVerifyCode( address, verifyCode, localStorageContent );

        console.log( 'waiting for next one ...' );

        await sleep( 20 * 1000 );
    }
    
}

async function start(): Promise<void> {
    await ready4Browser();
    console.log( 'browser is ready!'.green );
    
    letUsPlay();
}

process.on( 'uncaughtException', ( error: Error ) => {
    console.log( error );
    console.log( 'restarting' );
    setTimeout( start, 5 * 1000 );
} );

process.on( 'unhandledRejection', ( reason: string ) => {
    console.log( reason );
    console.log( 'restarting...' );
    setTimeout( start, 5 * 1000 );
} );

start();

