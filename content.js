/*jshint esversion:6, -W014 */
/*global jQuery, window, chrome, MutationObserver, console, Chart */

(function () {
"use strict";

let mutationObserver;
let $ = jQuery;
let handNum = 1;
let playerName = null;
let isT4;
let graphData = {};
let allowNewHands = true;
const paneID = 'azpspane';

function resetGraphData() {

    graphData = {
        data: {
            datasets: [{
                borderColor: "#A00",
                data: [ ],
                fill: false,
                label: 'A'
            }, {
                borderColor: "#22F",
                data: [ ],
                fill: false,
                label: 'B'
            }, {
                borderColor: "#3F3",
                data: [ ],
                fill: false,
                label: 'C'
            }, {
                borderColor: "#FF3",
                borderWidth: 6,
                data: [ ],
                fill: false,
                label: 'D'
            }],
            labels: [0]
        },
        options: {
            elements: {
                line: {
                    borderWidth: 3,
                    cubicInterpolationMode: 'monotone',
                    lineTension: 0,
                    spanGaps: true,
                    steppedLine: true
                }
            },
            layout: {
                padding: {
                    bottom: 0,
                    left: 0,
                    right: 10,
                    top: 0
                }
            },
            legend: {
                labels: {
                    boxWidth: 20,
                    fontColor: '#EEE'
                }
            },
            scales: {
                xAxes: [{
                    ticks: {
                        display: false
                    }
                }],
                yAxes: [{
                    ticks: {
                        callback: function(value, index, values) {
                            return '' + value/1000 + 'k';
                        }
                    }
                }]
            },
            title: {
                display: true,
                padding: 0,
                position: 'bottom',
                text: 'ApplySci Tenhou Score Pane'
            }
        },
        type: 'line'
    };

}

function getGamePane() {

    // flag to indicate whether this is tenhou.net/4
    if (isT4 === undefined) {
        isT4 = window.location.pathname.substring(0,2) === '/4';
    }
    if (isT4) {
        return $('div.nosel:lt(2)');
    } else {
        return $('div.nosel > div.nosel.tbl:first');
    }

}

function setToObserve() {

    mutationObserver.observe(document.documentElement, {
        characterData: true,
        childList: true,
        subtree: true
    });

}

chrome.runtime.onMessage.addListener(setToObserve);

function setWidth() {

    let gamePane = getGamePane();
    $('#' + paneID).css({
        'width': Math.floor($('body').width() - gamePane.width() - 40)
    });
    moveMainPane();

}

function moveMainPane() {

    let gamePane = getGamePane();
    if (isT4) {
        gamePane.css('transform' ,'translateX(0)');
    } else {
        gamePane
            .css('margin-left', 10)
            .next()
                .css('left', 0);
    }

}

function scorePaneInit() {

    allowNewHands = true;
    $('#' + paneID)
        .append($('<button>')
            .addClass('azpsreset')
            .click(resetPane)
            .text('reset score pane')
        )
        .append($('<div>')
            .addClass('hands')
            .append($('<h3>').text('The ApplySci Tenhou Score Pane').attr('id', 'azps_start')
        ));

}

function scorePane() {

    // if our score pane isn't present, create it

    let pane = $('#' + paneID);
    let fontsize = isT4 ? '0.8em' : '0.5em';

    if (pane.length === 0) {
        pane = $('<div>').prop('id', paneID).css('fontSize', fontsize);
        $('body').append(pane);
        setWidth();
        scorePaneInit();
        resetBetweenGames();
    }
    if (!('data' in graphData)) {
        resetGraphData();
    }

    return pane;

}

function resetPane() {

    resetBetweenGames();
    scorePane().empty();
    scorePaneInit();
}

function rememberPlayerName(node) {

    if (playerName !== null) {
        return;
    }

    let players;
    if (isT4) {
        players = $('.bbg5', node);
        let me = players.eq(players.length - 1);
        if (players.length === 3 && graphData.data.datasets.length === 4) {
            graphData.data.datasets.splice(2,1); // remove the green line for sanma
        }
        if (me.length) {
            playerName = me.children('span:eq(1)').text();
        }
        for (let i=0; i < players.length; i++) {
            let name = players.eq(i).children('span:last').text();
            graphData.data.datasets[i].label = name;
        }
    } else {
        let player = $('#sc0', node);
        if (player.length) {
            if ($('#sc3', node).length === 0 && graphData.data.datasets.length === 4) {
                // remove the green score line (the missing 4th player) for sanma
                graphData.data.datasets.splice(2,1);
            }
            playerName = player.children('span:last').text();
            graphData.data.datasets[graphData.data.datasets.length - 1].label = decodeURIComponent(playerName);
            for (let i=1; i<4; i++) {
                player = $('#sc'+i, node);
                if (player.length > 0) {
                    let name = player.children('span:last').text();
                    graphData.data.datasets[3 - i].label = name;
                }
            }
        }
    }

}

function getHandName(node) {

    if (isT4) {
        let honbaString = getT4ScoreTable(node).find('td:first')[0].childNodes[1].nodeValue;
        if (honbaString === null) {
            return false;
        }
        let nHonba =  honbaString.trim();
        // this seems ridiculously brittle, but works for now
        let hand = $('div.nosel > div.nopp > div.nopp > span.gray:first')
                .eq(0).parent().find('span').slice(0,2).text();
        if (nHonba !== '0') {
            hand += '-' + nHonba;
        }
        handNum++;
        return hand;
    } else {
        return 'Hand ' + handNum++;
    }

}

function getHandImageT3(tiles, winner) {

    // copy the image of the winning hand

    let sx, sy, sdx, sdy, tdx, tdy;
    let w = Math.round($(tiles).parent().width());
    let rotation = winner * Math.PI/2;
    let source = $('div.nosel > div.tbl > canvas:eq(1)');
    let ctx = tiles.getContext('2d');
    // ctx.imageSmoothingEnabled = true;

    let sourceWidth = source.parent().parent().width();
    let sourceHeight = source.parent().parent().height();

    switch(winner) {
        case 1:
            sdx = Math.ceil(sourceWidth * 0.1);
            sdy = Math.ceil(sourceHeight * 0.85);
            sx = source.width() - sdx;
            sy = 0;
            tdx = w * sdy/sdx;
            tdy = w;
            break;
        case 2:
            sdx = Math.ceil(sourceWidth * 0.7);
            sdy = Math.ceil(sourceHeight * 0.12);
            sx = Math.ceil(sourceWidth * 0.15);
            sy = 0;
            tdx = w;
            tdy = w * sdy/sdx;
            break;
        case 3:
            sdx = Math.ceil(sourceWidth * 0.08);
            sdy = Math.ceil(sourceHeight * 0.9);
            sx = 0;
            sy = 0;
            tdx = Math.round(w * sdx/sdy);
            tdy = w;
            break;
        default:
            sdx = sourceWidth;
            sdy = Math.ceil(sourceHeight * 0.22);
            sx = 0;
            sy = source.height();
            tdx = w;
            tdy = Math.round(w * sdy/sdx);
            break;
    }
    console.log('s=' + sdx + ',' + sdy + '; t=' + tdx + ',' + tdy);
    tiles.height = tdy;
    ctx.translate(tiles.width/2, tdy/2);
    ctx.rotate(rotation);
    ctx.translate(-tiles.width/2, -tdy/2);
    ctx.drawImage(source[0], sx, sy, sdx, sdy, 0, 0, tdx, tdy);

}

function getHandImageT4(node, tiles) {

    // copy the image of the winning hand

    let source = $('canvas:first', node);
    tiles.height = Math.ceil(source.height() * tiles.width / source.width());
    tiles.getContext('2d').imageSmoothingEnabled = true;
    tiles.getContext('2d').drawImage(source[0], 0, 0, Math.round(tiles.width), Math.round(tiles.height));

}

function showResult(texts, handName, node, hide) {

    let newEl = $('<div>').html(texts);
    if (hide) {
        newEl.addClass('hidden');
    }
    $('div.hands', scorePane()).prepend(newEl).prop('scrollTop', 0);
    if (node !== null) {
        if (isT4) {
            let tiles = document.createElement('canvas');
            newEl.prepend(tiles);
            getHandImageT4(node, tiles);
        } else {
            // work out from texts which player has won: 0=us, 1=right, 2=opposite, 3=left
            let winner = 0;
            $('table', newEl).eq(1).find('tr').each(
                function findWinner(id) {
                    if ($('td', this).eq(3).text().substr(0,1) === '+') {
                        winner = id;
                    }
                }
            );
            // getHandImageT3(tiles, winner); // still working on this
        }
    }
    newEl.prepend($('<h2>').text(handName).attr('id', 'azps_' + handName.replace(' ', '_')));
    return newEl;

}

function getVal(node) {

    return node.nodeValue || node.innerText;

}

function appendNodes(fromDom) {

    let toString = '';
    fromDom.childNodes.forEach(function appendOneNode(node) {
        toString += getVal(node) + ' ';
    });
    return toString;

}

function riichiHonba(node) {

    return '<span class=azpsicons>'
            + $("tr:first td:first", node)[0].innerText
            + '</span>';

}

function chartOneScore(player, totalScore, score) {

    if (graphData.data.datasets[player].data.length === 0) {
        graphData.data.datasets[player].data.push(totalScore);
    }
    graphData.data.datasets[player].data.push(totalScore + parseFloat(score));

}

function getOneScore(node, player) {

    // T3: #scN wind, space, name, space, total score, [optional: delta]
    // T4: <div class="bbg5"><span>東</span> <span>COM</span><br>25000</div>

    let totalLine = '';
    let nNodes = node.childNodes.length;
    let score = 0;

    [0, 2, 4].forEach(function (idx) {
        totalLine += '<td>'
            + (idx < nNodes ? getVal(node.childNodes[idx]) : '')
            + '</td>';
    });


    if (node.childNodes.length > 5) {
        score = getVal(node.childNodes[5]);
        totalLine =  '<tr class="'
            + (score > 0 ? 'azpsplus' : 'azpsminus')
            + '">'
            + totalLine
            + '<td>'
            + score;
    } else {
        totalLine = '<tr>' + totalLine + '<td>';
    }
    let totalScore = parseFloat(getVal(node.childNodes[4]));
    if (nNodes >= 5) {
        chartOneScore(player, totalScore, score);
    }
    return totalLine + '</td></tr>';

}

function scoreTableT3(node) {

    let totalLine = '<table>';
    let nPlayers = 3 + ($('#sc3', node).length ? 1 : 0);
    Array.from(new Array(nPlayers).keys()).forEach(function (i) {
        totalLine += getOneScore($('#sc' + i, node)[0], nPlayers - 1 - i);
    });
    return totalLine + '</table>';

}

function scoreTableT4(node) {

    let players = $('.bbg5', node);
    let table = '<table>';
    for (let i=0; i < players.length; i++) {
        table += getOneScore(players.eq(i)[0], i);
    }
    return table + '</table>';

}

function getT4ScoreTable(node) {

    return  $('table .bbg5', node).parents('table:first');

}

function showExhaustiveDraw(node) {

    scorePane();
    rememberPlayerName(node);
    let outcome;
    let block = '<h3>Draw ';
    if (isT4) {
        outcome = $('table', node);
        block += riichiHonba(getT4ScoreTable(node)) + '</h3>' + scoreTableT4(outcome);
    } else {
        outcome = node.childNodes[0].childNodes[1];
        block += riichiHonba(outcome) + '</h3>' + scoreTableT3(outcome);
    }
    let handName = getHandName();
    graphData.data.labels.push(handName);
    showResult(block, handName, null, false);

}

function yakuLine(yaku, han) {

    han = han.trimLeft();
    return '<tr'
        + ((han.length > 0 && han[0] === '0') ? ' class=azpsgrey' : '')
        + '><td>'
        + yaku
        + '</td><td>'
        + han
        + '</td></tr>';

}

function insertWinTableIntoDOM(node, totalLine, nYaku) {

    let handName = getHandName();
    if (handName !== false) {
        graphData.data.labels.push(handName);
        let scoreDiv = showResult(totalLine, handName, node, true);
        // pause before revealing the scores, so that we don't spoil any uradora surprise
        setTimeout(() => scoreDiv.removeClass('hidden'), 500 + nYaku * 1000);
    }

}

function winTableT3(node) {

    let totalLine;
    let nYaku;

    totalLine = appendNodes(node.children[0])  // score
        + '<br>'
        + riichiHonba(node.childNodes[2]);

    // get the yaku

    totalLine += '<table>';
    let yakuTable = $("tr:not(:has(table))", node.childNodes[1]);
    nYaku = yakuTable.length;
    yakuTable.each(function addYakuLine(row) {
        totalLine += yakuLine(getVal(this.childNodes[0]), getVal(this.childNodes[1]));
    });
    totalLine += '</table>';

    // get the scores
    totalLine += scoreTableT3(node.childNodes[2]);

    insertWinTableIntoDOM(node, totalLine, nYaku);
}

function winTableT4(node) {

    let totalLine;
    let nYaku;

    if ($('.yk,.ym',node).length === 0) {
        return;
    }
    let scoreTable = getT4ScoreTable(node);

    totalLine = appendNodes($('div.s0 > div:eq(1)', node)[0])
            + '<br>'
            + riichiHonba(scoreTable);

    // get the yaku

    totalLine += '<table>';
    let yakuList = $('table:first table tr', node);
    nYaku = yakuList.length;
    yakuList.each(function getOneYaku(row) {
        totalLine += yakuLine($('.yk,.ym', this).text(), $('.hn', this).text());
    });
    totalLine += '</table>';

    totalLine += scoreTableT4(scoreTable);

    insertWinTableIntoDOM(node, totalLine, nYaku);

}

function showWin(node) {

    scorePane();
    rememberPlayerName(node);

    if (isT4) {
        winTableT4(node);
    } else {
        winTableT3(node);
    }

}

function hasWon() {

    // if we are here, then the live player has won the game
    // TODO do something nice to mark the win; add options sceen to manage this
    console.log('winner, winner, chicken dinner');

}

function resetBetweenGames() {

    playerName = null;
    handNum = 1;
    resetGraphData();

}

function curryClickChart(chart, labels) {

    // currying functions will always feel like witchcraft to me
    return function clickChart(evt){
        evt.stopPropagation();
        evt.preventDefault();
        const activeXPoints = chart.getElementsAtXAxis(evt);
        let handNumber = activeXPoints[0]._index;
        let id;
        if (handNumber === 0) {
            id = 'azps_start';
        } else {
            id = 'azps_' + labels[handNumber].replace(' ', '_');
        }
        document.getElementById(id).scrollIntoView();
        return false;
    };

}

function scoreChart() {

    let pane = $('#'+paneID);
    if ($('canvas.chart', pane).length) {
        return;
    }
    let chartEl = $('<canvas>').addClass('chart');
    pane.prepend(chartEl);
    chartEl.height = Math.ceil(pane.width * 0.6);
    const chart = new Chart(chartEl[0], graphData);
    $('div.hands', pane).css('top', chartEl.offset().top + chartEl.outerHeight(true) + 20);

    chartEl.click(curryClickChart(chart, graphData.data.labels));

}

function checkWinner(node) {

    let winner;

    if (isT4) {
        winner = $('.bbg5:first')[0].childNodes[0].nodeValue;
    } else {
        winner = $('table > tbody > tr > td:first', node)[0]
            .childNodes[0]
            .nodeValue;
    }
    let isWinner = winner === playerName;

    if (isWinner && $('div.tbc.bgb:contains(Exit)').length + $('button:contains(Exit)').length === 0) {
        hasWon();
    }

}

function handleEnd(node) {

    scorePane();
    allowNewHands = false;
    scoreChart();
    resetBetweenGames();
    checkWinner();

}

function removePane() {

    $('#' + paneID).remove();

    // Re-centre the tenhou main panel

    let gamePane = getGamePane();
    if (isT4) {
        gamePane.css('transform' ,'translateX('
            + Math.round(($('body').width() - gamePane.width())/2)
            + 'px)');
    } else {
        gamePane.css('margin', '0 auto');
    }

    resetBetweenGames();
    allowNewHands = true;
}

function showAbortiveDraw(node) {

    return showExhaustiveDraw(node);

}

function handleStart(node) {

    allowNewHands = true;
    if ($('#' + paneID + ' > div.hands > div').length > 0) {
        return false;
    }
    resetPane();
    rememberPlayerName(node);

}

function stringStartsWith(haystack, needles) {

    let found = false;
    needles.some(function testOneNeedle(needle) {
        if (haystack.substr(0, needle.length) === needle) {
            found = true;
            return true;
        }
    });
    return found;

}

function checkNode(oneNode) {

    let testText = oneNode.innerText;
    if (typeof testText === 'undefined' || testText === null) {
        return;
    }

    if ($('#' + paneID).length && (
            $('#pane1', oneNode).length
            || (isT4 && oneNode.className.includes('s0') && testText.includes('Online:'))
        ) ) {

        return removePane();

    }

    if (!allowNewHands) {
        return;
    }

    if (oneNode.className.includes(isT4 ? 'nopp' : 'tbc') && testText.length > 10) {
        if (stringStartsWith(testText, ['Start', '對局', 'Début', 'Bắt đầu'])) {
            return handleStart(oneNode);
        }
        if (stringStartsWith(testText, ['終局','End', 'Fin', 'Kết thúc', 'Koniec'])) {
            return handleEnd(oneNode);
        }
        if (stringStartsWith(testText, ['Redeal', '流局', 'Ryuukyoku', 'Rejouer', 'Ván hoà', 'Powtórka'])) {
            return showExhaustiveDraw(oneNode);
        }
    }

    if (oneNode.childNodes[0].id === 'total'
        || (isT4 && testText.length > 20 && oneNode.className.includes('nopp')
        ) ) {

        return showWin(oneNode);

    }

    if (oneNode.className === 'tbc' && $('button', oneNode).length
            && $('table', oneNode).length === 1
            && !isT4 && $('#sc0', oneNode).length
            && testText.includes('') && testText.includes('')) {

        // https://tenhou.net/3/?log=2016032809gm-0089-0000-19c59dbd&tw=1&ts=7
        // https://tenhou.net/4/?log=2018031407gm-0009-0000-0e47c343&tw=0&ts=2


        if (stringStartsWith(testText, [
                '觀戰', 'Redeal: ', 'Torpillage: ', 'Ván hoà: ', 'Powtórka (',
                'Kyuushu kyuuhai', 'Kyūshu kyūhai',
                'Suukaikan', 'Sūkaikan',
                'Suufon renda', 'Sūfon renda',
                'Sanchahou', 'Sanchahō',
                'Suucha riichi', 'Sūcha riichi',
                ])) {

            console.log('is abortive draw');
            return showAbortiveDraw(oneNode);
        }

    }

}

function onMutate(mutations) {

    mutationObserver.disconnect();
    mutations.forEach(function doAMutation(oneMutation) {
        if (oneMutation.addedNodes.length) {
            oneMutation.addedNodes.forEach(function do1node(node) {
                try {
                    if (node.childNodes.length) {
                        checkNode(node);
                    }
                } catch (e) {
                    console.log(e);
                }
            });
        }
    });
    setToObserve();

}

// This is what happens when the page is first loaded

Chart.platform.disableCSSInjection = true;

chrome.storage.local.get(null, function(options) {

    getGamePane(); // ensure isT4 is set
    // we're not using options yet, but almost certainly will do eventually
    mutationObserver = new MutationObserver(onMutate);
    setToObserve();
    let timeout;
    $(window).resize(function() {
        // this has a delay, as Tenhou itself takes time
        // to resize the game pane when the screen is resized, and we need
        // to wait for it to finish before we do our stuff
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(setWidth, 1000);
    });

});

}());