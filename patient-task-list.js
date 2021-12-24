// ==UserScript==
// @name         Practice Fusion Labs Autofill
// @namespace    http://tampermonkey.net/
// @version      0.4
// @description  lololol
// @author       David Ding
// @include      /^https?://.*practicefusion\.com/.*$/
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant window.onurlchange
// @grant window.location
// ==/UserScript==

// https://raw.githubusercontent.com/TechyChan/PracticeFusionTools/main/patient-task-list.js

let fieldsArr = [
    [/hemoglobin a1c$/i, 'A1C'],
    [/fructosamine/i, 'Fructosamine'],
    [/hemoglobin$/i, 'Hgb'],
    [/creatinine$/i, 'Cr'],
    [/(albumin|alb)\/(creatinine|creat) ratio/i, 'UMA/Cr'],
    [/glutamic acid decarboxylase 65 ab/i, 'GAD65Ab'],
    [/c-peptide/i, 'C-pep'],
    [/tsh$/i, 'TSH'],
    [/t4\,?\s?free/i, 'FT4'],
    [/triiodothyronine \(t3\)/i, 'T3'],
    [/T3\,? free$/i, 'FT3'],
    [/tsi$/i, 'TSI'],
    [/thyroid peroxidase (antibodies|\(tpo\) ab)/i, 'TPOAb'],
    [/white blood cell count/i, 'WBC'],
    [/thyroglobulin by ima/i, 'Tg'],
    [/thyroglobulin by antibody/i, 'TgAb'],
    [/ast \(sgot\)/i, 'AST'],
    [/alt \(sgpt\)/i, 'ALT'],
    [/alkaline phosphatase/i, 'ALP'],
    [/bilirubin, total/i, 'Tbil'],
    [/calcium$/i, 'Cal'],
    [/parathyroid\s?hormone/i, 'PTHi'],
    [/vitamin d\,?\s?25\-(hydroxy|OH)/i, '25-HD'],
    [/cortisol$/i, 'Cortisol'],
    [/acth, plasama/i, 'ACTH'],
    [/prolactin$/i, 'PRA'],
    [/igf\-1\(bl\)/i, 'IGF-1'],
    [/cholesterol,?\s?total$/i, 'Lipid'],
    // [/albumin$/i, 'Alb'],
    [/(testosterone\,? (total|serum)|^testosterone$)/i, 'T'],
    [/(testosterone\,? free|free testosterone)/i, 'FT'],
    [/testosterone,?\s?bi/i, 'Bio T'],
    [/(psa\,?\s?total|prostate specific ag)/i, 'PSA'],
    [/estradiol/i, 'Estradiol'],
    [/dhea\-?\s?sulfate/i, 'DHEA-s'],
    [/androstenedione/i, 'Androstenedione'],
    [/fsh$/i, 'FSH'],
    [/lh$/i, 'LH'],
    [/sodium$/i, 'NA'],
    [/potassium$/i, 'K'],
    [/magnesium/i, 'Mg'],
    [/phosphate \(as phosphorus\)/i, 'Phos'],
    [/aldosterone\, lc\/ms/i, 'ALD'],
    [/aldo\/pra ratio/i, 'ALD/PRA ratio'],
    [/plasma renin activity\, lc\/ms\/ms/i, 'Renin activity'],
    [/calcitonin$/i, 'Calcitonin'],
    [/^cea$/i, 'CEA'],
    [/17\-oh progesterone/i, '17-OH progesterone'],
    [/beta\-hcg\, qualitative/i, 'pregnancy test'],
    [/angiotensin\-1\-converting enzyme/i, 'ACE'],
    [/vitamin d\, 1\,25dihydroxy/i, '1,25-DHVD'],
];

let abnormalFieldsSet = new Set([
    'AST',
    'ALT',
    'ALP',
    'Tbil',
    'Na',
    'K',
]);

function rafAsync() {
    return new Promise(resolve => {
        requestAnimationFrame(resolve); //faster than set time out
    });
}

async function checkElement(selector, seconds = 10) {
    let querySelector = null;
    let iteration = 0;
    let maxIterations = 60 * seconds;
    
    while (querySelector === null) {
        await rafAsync();
        querySelector = document.querySelector(selector);
        if (iteration >= maxIterations) break;
    }
    return querySelector;
}

async function patientView() {
    // can't use hash (#) in the @include, so we have to do this instead
    if (!/.*\/charts\/patients\/.*/.test(window.location.href)) {
        return;
    }

    // wait till at least one observation-value field has been populated
    await checkElement('[data-element=observation-value]');

    // only for results page
    if (!document.querySelector('#result')) {
        return;
    }

    let resultCommentGroup = await checkElement('.result-comment');

    if (document.querySelector('#custom-autofill-btn')) {
        //if btn already exists, return
        return;
    }

    let autoFillBtn = document.createElement('button');
    autoFillBtn.setAttribute('id', "custom-autofill-btn");
    autoFillBtn.innerHTML = 'Autofill (overwrite)';
    autoFillBtn.style.cssText = `
        padding: 4px 8px;
        border-radius: 4px;
        margin-top: 8px;
        background-color: #5c96c4;
        color: white;
        border-color: transparent;
    `;

    autoFillBtn.addEventListener('click', async () => {
        let commentsField = autoFillBtn.previousElementSibling.querySelector('*:last-child');

        let collectedDateField = Array.from(document.querySelectorAll('label'))
            .find(el => /collected date/i.test(el.textContent))?.nextElementSibling;
    
        let dateMatch = collectedDateField?.textContent?.match(/(\d\d\/\d\d\/)(\d{4})/);
        let collectedDateVal = dateMatch[1] + dateMatch[2].slice(2);
    
        await commentsField.click();
    
        let resultStr = `${collectedDateVal} `;
        let allFieldLabels = Array.from(document.querySelectorAll('[data-element=observation-name]'));
        for (let [fieldRegexp, fieldAbbr] of fieldsArr) {
            let fieldLabel = allFieldLabels.find(el => fieldRegexp.test(el.textContent.trim()));
    
            let fieldValue = fieldLabel?.parentNode.parentNode.querySelector('[data-element=observation-value]').textContent.trim();
    
            if (fieldValue == null) continue;

            if (fieldAbbr === 'Cr') {
                // special casing for creatinine

                let nonAFLabel = allFieldLabels.find(el => /eGFR NON-AFR\.? AMERICAN/i.test(el.textContent.trim()));
                let nonAFValueIcon = nonAFLabel?.parentNode.parentNode.querySelector('[data-element=observation-value] [data-element=abnormal-icon]');
                let nonAFValue = nonAFLabel?.parentNode.parentNode.querySelector('[data-element=observation-value]').textContent.trim();

                let AFLabel = allFieldLabels.find(el => /eGFR AFRICAN AMERICAN/i.test(el.textContent.trim()));
                let AFValueIcon = AFLabel?.parentNode.parentNode.querySelector('[data-element=observation-value] [data-element=abnormal-icon]');
                let AFValue = AFLabel?.parentNode.parentNode.querySelector('[data-element=observation-value]').textContent.trim();

                if (nonAFValueIcon || AFValueIcon) {
                    resultStr += `${fieldAbbr} ${fieldValue}/GFR ${nonAFValue}-${AFValue}, `;
                    continue;
                }
            }

            if (fieldAbbr === 'Lipid') {
                // special casing for lipids

                let lipidRegexps = [
                    /triglycerides$/i,
                    /hdl cholesterol$/i,
                    /^ldl.chol(esterol)?/i,
                ];

                resultStr += `${fieldAbbr} ${fieldValue}/`;
                for (let lipidRegexp of lipidRegexps) {
                    let lipidLabel = allFieldLabels.find(el => lipidRegexp.test(el.textContent.trim()));
                    let lipidValue = lipidLabel?.parentNode.parentNode.querySelector('[data-element=observation-value]').textContent.trim();
                    if (lipidValue == null) continue;
                    resultStr += lipidValue + '/'
                }

                resultStr = resultStr.slice(0, resultStr.length - 1) + ', ';

                continue;
            }

            if (abnormalFieldsSet.has(fieldAbbr)) {
                let fieldValueIcon = fieldLabel?.parentNode.parentNode.querySelector('[data-element=observation-value] [data-element=abnormal-icon]');

                if (!fieldValueIcon) {
                    // if this field does not have an abnormal indicator, then skip it
                    continue;
                }
            }
    
            resultStr += `${fieldAbbr} ${fieldValue}, `;
        }


        if (resultStr[resultStr.length - 1] === ' ') {
            resultStr = resultStr.slice(0, resultStr.length - 2);
        }
    
        let commentsTextArea = await checkElement('.result-comment textarea');
        commentsTextArea.value = resultStr;
        commentsTextArea.focus();
        
        // can't blur right away, it seems
        setTimeout(() => {
            commentsTextArea.blur();
        }, 300);
    });

    resultCommentGroup?.appendChild(autoFillBtn);
}

async function tasksView() {
    return; //not working for now
    // wait till at least row exists
    await checkElement('.data-table__container');

    let firstTab = document.querySelector('li[data-element=tasks-tab-0]');

    if (!firstTab.dataset.isCustomHooked) {
        firstTab.addEventListener('click', function() {
            setTimeout(() => {
                tasksView()
            }, 1000);
        });

        firstTab.dataset.isCustomHooked = true;
    }

    // are we on the Lab results tab (first tab?)
    if (!document.querySelector('li[data-element=tasks-tab-0].composable-header__nav-tab--is-active')) {
        return;
    }

    if (document.querySelector('#custom-super-btn')) {
        return;
    }

    let rowTd = document.createElement('td');
    let superBtn = document.createElement('button');
    superBtn.setAttribute('id', "custom-super-btn");
    superBtn.innerHTML = 'Autofill All';
    superBtn.style.cssText = `
        padding: 4px 8px;
        border-radius: 4px;
        margin-top: 8px;
        background-color: #5c96c4;
        color: white;
        border-color: transparent;
    `;
    rowTd.appendChild(superBtn);

    document.querySelector('tr[data-element=data-table-row-0]').appendChild(rowTd);
}

(async function() {
    'use strict';

    if (window.onurlchange === null) {
        // feature is supported
        window.addEventListener('urlchange', (info) => {
            if (/.*\/charts\/patients\/.*/.test(info.url)) {
                patientView();
            } 
            if (!/.*\/tasks\/lists.*/.test(info.url)) {
                tasksView();
            }
        });
    }

    if (/.*\/charts\/patients\/.*/.test(window.location.href)) {
        patientView();
    } 
    if (!/.*\/tasks\/lists.*/.test(window.location.href)) {
        tasksView();
    }
})();