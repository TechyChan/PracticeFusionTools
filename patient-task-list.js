// ==UserScript==
// @name         Practice Fusion Labs Autofill
// @namespace    http://tampermonkey.net/
// @version      2.4
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
  [/glutamic acid decarboxylase 65 ab|GAD-65/i, 'GAD65Ab'],
  [/c-peptide/i, 'C-pep'],
  [/tsh$/i, 'TSH'],
  [/t4\,?\s?free/i, 'FT4'],
  [/t4(\s\(thyroxine\)), total/i, 'T4'],
  [/thyroglobulin(, lc\/ms\/ms)?/i, 'Tg'],
  [/t3\, total|triiodothyronine \(t3\)$/i, 'T3'],
  [/T3\,? free|triiodothyronine \(t3\), free$/i, 'FT3'],
  [/tsi|thyroid stim immunoglobulin$/i, 'TSI'],
  [/thyroid peroxidase (antibodies|\(tpo\) ab)/i, 'TPOAb'],
  [/white blood cell count|wbc/i, 'WBC'],
  [/thyroglobulin$|thyroglobulin by ima$/i, 'Tg'],
  [/thyroglobulin (by\s)?antibody$/i, 'TgAb'],
  [/ast(\s\(sgot\))?/i, 'AST'],
  [/alt(\s\(sgpt\))?/i, 'ALT'],
  [/alkaline phosphatase/i, 'ALP'],
  [/bilirubin, total/i, 'Tbil'],
  [/calcium$/i, 'Cal'],
  [/parathyroid\s?hormone|pth\, intact/i, 'PTHi'],
  [/vitamin d\,?\s?25\-(hydroxy|OH)/i, '25-HD'],
  [/cortisol\, total|cortisol \- am|cortisol, A\.M\./i, 'Cortisol'],
  [/acth, plasma/i, 'ACTH'],
  [/prolactin(\, undiluted)?$/i, 'PRL'],
  [/(igf\-1\(bl\)|igf 1\,? lc\/ms)/i, 'IGF-1'],
  [/cholesterol,?\s?total$/i, 'Lipid'],
  [/albumin$/i, 'Alb'],
  [/(testosterone\,? (total|serum)|^testosterone$)/i, 'T'],
  [/(testosterone\,? free|free testosterone)/i, 'FT'],
  [/testosterone,?\s?bi/i, 'Bio T'],
  [/sex hormone binding globulin/i, 'SHBG'],
  [/(psa\,?\s?total|prostate specific ag)/i, 'PSA'],
  [/estradiol/i, 'Estradiol'],
  [/dhea\-?\s?sulfate/i, 'DHEA-s'],
  [/androstenedione/i, 'Androstenedione'],
  [/fsh$/i, 'FSH'],
  [/lh$/i, 'LH'],
  [/sodium$/i, 'NA'],
  [/potassium$/i, 'K'],
  [/magnesium/i, 'Mg'],
  [/phosphate \(as phosphorus\)|phosphorus/i, 'Phos'],
  [/aldosterone\, lc\/ms|aldosterone/i, 'ALD'],
  [/aldo\/pra ratio|aldos\/renin ratio/i, 'PAC/PRA ratio'],
  [/plasma renin activity\, lc\/ms\/ms|renin activity\, plasma/i, 'PRA'],
  [/calcitonin$/i, 'Calcitonin'],
  [/^cea$/i, 'CEA'],
  [/17\-oh progesterone/i, '17-OH progesterone'],
  [/beta\-hcg\, qualitative/i, 'pregnancy test'],
  [/angiotensin\-1|ace\,? serum/i, 'ACE'],
  [
    /vitamin d\s?\,?\s?1\s?\,\s?25dihydroxy|vitamin d\,?\s?1\,25\s?\(oh\)2\,?\s?total|calcitriol\(?1\,?25\s?di\-oh\svit\sD\)/i,
    '1,25-DHVD',
  ],
  [
    /(endomysial antibody)|(glutamic acid decarboxylase)|(t-transglutaminase \(ttg\))/i,
    'Celiac screen',
  ],
  [/vitamin b12/i, 'B12'],
];

let abnormalFieldsSet = new Set(['AST', 'ALT', 'ALP', 'Tbil', 'NA', 'K']);

let customComparatorFieldsMap = {
  Alb: (str) => new Number(str) < 4,
};

function rafAsync() {
  return new Promise((resolve) => {
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

function getValueElByLabel(labelEl, valueSelector) {
  const v1 = labelEl?.parentNode.parentNode.querySelector(valueSelector);
  const v2 =
    labelEl?.parentNode.parentNode.parentNode.querySelector(valueSelector);
  const v3 =
    labelEl?.parentNode.parentNode.parentNode.parentNode.querySelector(
      valueSelector
    );

  return v1 ?? v2 ?? v3;
}

async function patientView() {
  // can't use hash (#) in the @include, so we have to do this instead
  if (!/.*\/charts\/patients\/.*\/results\//.test(window.location.href)) {
    return;
  }

  // wait till at least one observation-value field has been populated
  await checkElement('[data-element=observation-value]');

  let resultCommentGroup = await checkElement('.result__result-comment');

  if (document.querySelector('#custom-autofill-btn')) {
    //if btn already exists, return
    return;
  }

  let autoFillBtn = document.createElement('button');
  autoFillBtn.setAttribute('id', 'custom-autofill-btn');
  autoFillBtn.innerHTML = 'Autofill (overwrite)';
  autoFillBtn.style.cssText = `
        padding: 4px 8px;
        border-radius: 8px;
        margin-top: 8px;
        background-color: #5c96c4;
        color: white;
        border-color: transparent;
    `;

  autoFillBtn.addEventListener('click', async () => {
    let commentsField =
      autoFillBtn.previousElementSibling.querySelector('*:last-child');

    let reportDateField = Array.from(document.querySelectorAll('td')).find(
      (el) => /report date/i.test(el.textContent)
    )?.nextElementSibling;

    let dateMatch = reportDateField?.textContent?.match(
      /(\d\d\/\d\d\/)(\d{4})/
    );
    let collectedDateVal = dateMatch[1] + dateMatch[2].slice(2);

    await commentsField.click();

    let resultStr = `${collectedDateVal} `;
    let allFieldLabels = Array.from(
      document.querySelectorAll('[data-element=observation-name]')
    );
    for (let [fieldRegexp, fieldAbbr] of fieldsArr) {
      let fieldLabel = allFieldLabels.find((el) =>
        fieldRegexp.test(el.textContent.trim())
      );

      let fieldValue = getValueElByLabel(
        fieldLabel,
        '[data-element=observation-value]'
      )?.textContent.trim();

      if (fieldValue == null) continue;

      if (fieldAbbr === 'Cr') {
        // special casing for creatinine

        let nonAFLabel = allFieldLabels.find((el) =>
          /eGFR NON-AFR\.? AMERICAN|eGFR If NonAfricn/i.test(
            el.textContent.trim()
          )
        );
        let nonAFValueIcon = getValueElByLabel(
          nonAFLabel,
          '[data-element=observation-value] [data-element=abnormal-icon]'
        );

        let nonAFValue = getValueElByLabel(
          nonAFLabel,
          '[data-element=observation-value]'
        )?.textContent.trim();

        let AFLabel = allFieldLabels.find((el) =>
          /eGFR AFRICAN AMERICAN|eGFR If Africn Am/i.test(el.textContent.trim())
        );
        let AFValueIcon = getValueElByLabel(
          AFLabel,
          '[data-element=observation-value] [data-element=abnormal-icon]'
        );
        let AFValue = getValueElByLabel(
          AFLabel,
          '[data-element=observation-value]'
        )?.textContent.trim();

        let genericLabel = allFieldLabels.find((el) =>
          /eGFR$/i.test(el.textContent.trim())
        );
        let genericValueIcon = getValueElByLabel(
          genericLabel,
          '[data-element=observation-value] [data-element=abnormal-icon]'
        );
        let genericValue = getValueElByLabel(
          genericLabel,
          '[data-element=observation-value]'
        )?.textContent.trim();

        if (nonAFValueIcon || AFValueIcon) {
          resultStr += `${fieldAbbr} ${fieldValue}/GFR ${nonAFValue}-${AFValue}, `;
          continue;
        } else if (genericValueIcon) {
          resultStr += `${fieldAbbr} ${fieldValue}/GFR ${genericValue}, `;
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
          let lipidLabel = allFieldLabels.find((el) =>
            lipidRegexp.test(el.textContent.trim())
          );
          let lipidValue = getValueElByLabel(
            lipidLabel,
            '[data-element=observation-value]'
          )?.textContent.trim();
          if (lipidValue == null) continue;
          resultStr += lipidValue + '/';
        }

        resultStr = resultStr.slice(0, resultStr.length - 1) + ', ';

        continue;
      }

      if (fieldAbbr === 'Celiac screen') {
        let antibodyLabel = allFieldLabels.find((el) =>
          /endomysial antibody.*iga/i.test(el.textContent.trim())
        );
        let glutamicAcidLabel = allFieldLabels.find((el) =>
          /tissue transglutaminase|t-transglutaminase \(ttg\)/i.test(
            el.textContent.trim()
          )
        );

        let antibodyValue = getValueElByLabel(
          antibodyLabel,
          '[data-element=observation-value]'
        )
          ?.textContent.trim()
          .toLowerCase();
        let glutamicAcidValue = getValueElByLabel(
          glutamicAcidLabel,
          '[data-element=observation-value]'
        )
          ?.textContent.trim()
          .toLowerCase();

        fieldValue = 'negative';

        if (antibodyValue == 'positive' || glutamicAcidValue == 'positive') {
          fieldValue = 'positive';
        }
      }

      if (abnormalFieldsSet.has(fieldAbbr)) {
        let fieldValueIcon = getValueElByLabel(
          fieldLabel,
          '[data-element=observation-value] [data-element=abnormal-icon]'
        );

        if (!fieldValueIcon) {
          // if this field does not have an abnormal indicator, then skip it
          continue;
        }
      }

      if (customComparatorFieldsMap[fieldAbbr]) {
        if (!customComparatorFieldsMap[fieldAbbr](fieldValue)) {
          continue;
        }
      }

      resultStr += `${fieldAbbr} ${fieldValue}, `;
    }

    if (resultStr[resultStr.length - 1] === ' ') {
      resultStr = resultStr.slice(0, resultStr.length - 2);
    }

    let commentsTextArea = await checkElement('.result-comment textarea');
    commentsTextArea.focus();
    commentsTextArea.value = resultStr;

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
    firstTab.addEventListener('click', function () {
      setTimeout(() => {
        tasksView();
      }, 1000);
    });

    firstTab.dataset.isCustomHooked = true;
  }

  // are we on the Lab results tab (first tab?)
  if (
    !document.querySelector(
      'li[data-element=tasks-tab-0].composable-header__nav-tab--is-active'
    )
  ) {
    return;
  }

  if (document.querySelector('#custom-super-btn')) {
    return;
  }

  let rowTd = document.createElement('td');
  let superBtn = document.createElement('button');
  superBtn.setAttribute('id', 'custom-super-btn');
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

  document
    .querySelector('tr[data-element=data-table-row-0]')
    .appendChild(rowTd);
}

(async function () {
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
