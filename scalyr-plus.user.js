// ==UserScript==
// @name         Scalyr+
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  Reloads scalyr pages automatically and shows any alerts as clickable notifications
// @author       João Pedro "jpsl00"
// @license      GPL version 3 or any later version; http://www.gnu.org/copyleft/gpl.html
// @match        https://app.scalyr.com/alerts?*
// @match        https://app.scalyr.com/dash?*
// @icon         https://www.google.com/s2/favicons?sz=128&domain=scalyr.com
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant        GM_notification
// @grant        GM_openInTab
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

(function() {
    'use strict';

    function load() {
        // Modules
        autoReload();
        checkAlerts();
    }

    function setup() {
        const container = document.createElement("div");
        container.innerHTML = `
            <a id="scalyr_plus" style="
                position:fixed;
                bottom: 0;
                right: 0;
                border-radius: 15px 0 0 0;
                background-color: #131516;
                padding: 4px 2px 2px 4px;
                text-align: center;
                line-height: 23px;
                box-shadow: -1px -1px 5px 2px #313537;
                z-index: 99999;
                cursor: pointer;
                width: 30px;
                height: 30px;
            ">🔧</a>
            <div id="scalyr-plus-settings"></div>
        `;
        document.body.insertBefore(container, document.body.firstChild);
        document.getElementById("scalyr_plus").addEventListener("click", () => GM_config.open());
        const settings = document.getElementById("scalyr-plus-settings");

        GM_config.init({
            id: 'scalyr_plus_settings',
            title: 'Scalyr+ Settings',
            fields: {
                autoRefreshId: {
                    type: 'hidden',
                    default: 0
                },
                autoRefresh: {
                    label: 'Auto Refresh',
                    section: ['Auto Refresh Settings'],
                    type: 'checkbox',
                    default: false
                },
                autoRefreshTimer: {
                    label: 'Refresh Every',
                    type: 'int',
                    min: 10,
                    max: 300,
                    default: 30
                },
                alertNotifications: {
                    label: 'Show Alerts as Notification',
                    section: ['Notifications'],
                    type: 'checkbox',
                    default: false
                }
            },
            events: {
                open: () => {
                    console.log('[Scalyr+] Settings opened');
                    GM_config.fields['autoRefreshId'].remove();
                    autoReload(true);
                },
                close: () => {
                    console.log('[Scalyr+] Settings closed');
                    load();
                },
                save: () => {
                    console.log('[Scalyr+] Settings saved');
                }
            },
            frame: settings,
            css: `
                .block, .config_header, .section_header, .section_header_holder, .config_var, .field_label {
                    margin: 0 !important;
                    padding: 0 !important;
                    border: 0 !important;
                    font-size: 100% !important;
                    font: inherit !important;
                    vertical-align: baseline !important;
                    color: hsla(0,0%,100%,.9) !important;
                    font-family: "Lato",Arial,sans-serif !important;
                    font-size: .875rem;
                }
                #scalyr_plus_settings {
                    border-radius: 15px;
                    border: none !important;
                    height: 75%;
                    max-height: 90%;
                    width: 75%;
                    max-width: 90%;
                    overflow: auto;
                    z-index: 99999;
                    box-shadow: 0px 0px 5px 2px #313537;
                    background-color: #1b2127;
                }
                #scalyr_plus_settings .config_header {
                    font-size: 24px !important;
                    font-weight: 700 !important;
                    font-family: "roobert",Arial,sans-serif !important;
                    background-color: #000 !important;
                    /* color: #aeb0ba !important; */
                    color: #fff !important;
                    align-items: center !important;
                    line-height: 56px !important;
                    vertical-align: middle !important;
                    height: 56px !important;
                }
                #scalyr_plus_settings .section_header_holder {
                    margin: 0 15px !important;
                }
                #scalyr_plus_settings .section_header {
                    margin-top: 15px !important;
                    color: hsla(0,0%,100%,.85) !important;
                    font-size: 1rem !important;
                    padding: .625rem 2rem .625rem 0 !important;
                    background-color: transparent !important;
                    border-bottom: 1px solid transparent !important;
                    border-color: rgba(210, 223, 252, .3) !important;
                    text-align: left !important;
                }
                #scalyr_plus_settings .config_var {
                    padding: 10px 0 0 0 !important;
                }
                #scalyr_plus_settings .field_label {
                    margin: 0 3px 0 0  !important;
                }
                #scalyr_plus_settings_buttons_holder {
                    margin: 10px 15px 0 !important;
                    vertical-align: middle !important;
                }
                #scalyr_plus_settings .saveclose_buttons, #scalyr_plus_settings .reset_holder {
                    border: 2px transparent !important;
                    display: inline-block !important;
                    background-color: rgba(133,143,173,.4) !important;
                    color: #fff !important;
                    padding: .25rem .5rem !important;
                    margin: 0 3px !important;
                    font-size: .75rem !important;
                    border-radius: 3px !important;
                    border-color: transparent !important;
                    cursor: pointer !important;
                }
                #scalyr_plus_settings .reset_holder:last-child {
                    margin: 0 0 0 3px !important;
                }
                #scalyr_plus_settings_resetLink {
                    color: #fff !important;
                    text-decoration: none !important;
                    width: 100%;
                    height: 100%;
                }
            `
        });

        load();
    }

    function autoReload(clear = false) {
        if (!clear && GM_config.get('autoRefresh') && GM_config.get('autoRefreshTimer')) {
            const time = GM_config.get('autoRefreshTimer') * 1000;
            const id = setTimeout(function(){
                console.log('[Scalyr+] Reloading');
                window.location.reload(1);
            }, time)
            GM_config.set('autoRefreshId', id);
        } else {
            clearTimeout(GM_config.get('autoRefreshId'));
            GM_config.set('autoRefreshId', 0);
        }
    }

    function checkAlerts() {
        console.log('[Scalyr+] Loaded');

        // Get all alerts in page
        const alerts = document.querySelectorAll('#root > div > div > div > div.tab-content > div.fade.tab-pane.active.show > div > div > div');

        console.log(`[Scalyr+] ${alerts.length} alerts`);
        alerts.forEach((alert) => {
            const action = alert.lastChild.firstChild.firstChild.href;

            if (GM_config.get('alertNotifications')) {
                GM_notification({
                    text: alert.innerText,
                    title: "Scalyr+ Alert",
                    highlight: true,
                    timeout: 15000,
                    onclick: () => {
                        console.log(`[Scalyr+] Opening Alert "${alert.innerText}"`);
                        GM_openInTab(action, {
                            active: true,
                            insert: true,
                            setParent: true
                        });
                    }
                });
            }
        });
    }

    addEventListener("DOMContentLoaded", setup());
})();
