/*
 * daily.js · 每日文案引擎
 * 语料出处（本地一手原典，见 ~/.claude/skills 下四个单书 skill）：
 *   《三命通会》十神性情宜忌 ·《滴天髓》理法与十干体性诗 ·《穷通宝鉴》调候 ·《五行大义》体性 ·《道德经》立场
 * 职责：
 *   dayHit(yong, ganEl, zhiEl)      —— 顺逆判定（干 0.6 / 支主气 0.4，调候命中优先）
 *   dayScore(gan, zhi, yong)        —— 万年历整月打点用的轻量分类
 *   dailyText(chart, st, yong, day) —— { ss, hit, theme, yi, ji, quote, ganNote, tone }
 * 挂 window.Daily；Node 可测（module.exports）。依赖 Engine。
 */
;(function (root) {
  'use strict'
  var E = root.Engine

  // ———— 十干体性短语（《滴天髓·天干》体性诗首联 + 白话动势）————
  var GAN_NOTE = {
    甲: { shi: '甲木参天，脱胎要火', su: '栋梁之气，宜立主干、定方向' },
    乙: { shi: '乙木虽柔，刲羊解牛', su: '藤萝之韧，宜柔进、借力缠绕而上' },
    丙: { shi: '丙火猛烈，欺霜侮雪', su: '太阳之气，宜照亮台面上的事' },
    丁: { shi: '丁火柔中，内性昭融', su: '灯烛之明，宜近处细照、暖一两人' },
    戊: { shi: '戊土固重，既中且正', su: '山岳之稳，宜守中、做压舱石' },
    己: { shi: '己土卑湿，中正蓄藏', su: '田园之土，宜栽培、养一件小事' },
    庚: { shi: '庚金带煞，刚健为最', su: '刀斧之利，宜裁断、砍掉冗余' },
    辛: { shi: '辛金软弱，温润而清', su: '珠玉之洁，宜打磨细节、去芜存菁' },
    壬: { shi: '壬水通河，周流不滞', su: '江河之势，宜流动、把面铺开' },
    癸: { shi: '癸水至弱，功化斯神', su: '雨露之润，宜无声滋养、点到即止' }
  }

  // ———— 十神 × 顺逆 × 身强弱 文案矩阵 ————
  // 结构：M[十神][hit]，hit ∈ xi(顺)/ji(留意)/ping(平)。
  // xi/ji 层含 s(身强/偏强)/w(身弱/偏弱) 两套宜忌；ping 共用。中和之命取 s/w 中义理更通者（mid 指向）。
  // 义理依据：身强喜克泄耗、身弱喜生扶（滴天髓·衰旺）；各神画像出《三命通会》各论。
  var M = {
    比肩: {
      xi: {
        theme: '并肩之日——手足同气，自立又有伴',
        s: { yi: '适合独当一面把事扛完，或与对等的伙伴分工并进', ji: '留意事事亲力亲为——今天该放的手也要放' },
        w: { yi: '适合找同伴搭把手：约人同做、开口求助都顺', ji: '留意单打独斗——今天的底气来自同盟，别逞强' },
        mid: 'w'
      },
      ji: {
        theme: '同气相争之日——人多手杂，先分清边界',
        s: { yi: '适合把合作的边界、账目、分工白纸黑字写清', ji: '留意争功与抢道：同类相聚易内耗，退半步反而快' },
        w: { yi: '适合借人多的场面观察学习，不必出头', ji: '留意被人情裹挟着答应事——先说「让我想想」' },
        mid: 's'
      },
      ping: { theme: '自处之日——不争不靠，各安其位', yi: '适合按自己的节奏推进手头事', ji: '留意无谓的比较心' }
    },
    劫财: {
      xi: {
        theme: '结伴闯关之日——敢拼的劲今天是助力',
        s: { yi: '适合谈判、竞标、抢进度——魄力今天有市场', ji: '留意赢了道理输了交情，锋头留三分' },
        w: { yi: '适合合伙借力：让能干的朋友带你一程', ji: '留意把帮手当靠山用过头——记得回礼' },
        mid: 'w'
      },
      ji: {
        theme: '分利之日——财怕分夺，捂紧口袋慢承诺',
        s: { yi: '适合主动「舍」：请客、分利、还人情，散得其所', ji: '留意冲动消费与仗义担保——今天钱包易漏' },
        w: { yi: '适合结算与对账，把模糊的钱物关系理清', ji: '留意合伙谈钱与临时借出——缓一天再定' },
        mid: 's'
      },
      ping: { theme: '棋逢对手之日——有竞争，但不必应战', yi: '适合观察同行在做什么，取其长', ji: '留意口头之争，赢了也无所得' }
    },
    食神: {
      xi: {
        theme: '从容生养之日——才华自然流露，福气藏在慢里',
        s: { yi: '适合产出：写、做、烹、教，把积累变成东西', ji: '留意摊子铺太大——食神之福在「够了就好」' },
        w: { yi: '适合小而美的输出，做一件让自己高兴的小事', ji: '留意过度付出耗神——产出之外记得进补休息' },
        mid: 's'
      },
      ji: {
        theme: '贪逸之日——安乐可享，别让它拖住正事',
        s: { yi: '适合犒赏自己，但给玩乐设个闹钟', ji: '留意口腹与懒散过度，正事被「明天再说」' },
        w: { yi: '适合真休息：好饭好觉，把电充满', ji: '留意边休边愧疚——要么好好歇，要么好好做' },
        mid: 'w'
      },
      ping: { theme: '细水长流之日——不急不赶，手艺见功', yi: '适合打磨日常的手艺与流程', ji: '留意为了新鲜感另起炉灶' }
    },
    伤官: {
      xi: {
        theme: '锋芒之日——利器出鞘，用在作品不用在人',
        s: { yi: '适合创作、提案、公开表达——今天的话有光', ji: '留意言多必失：对事尽兴，对人留口德' },
        w: { yi: '适合小范围亮观点：先讲给信得过的人听', ji: '留意逞强揽下超出体力的表现机会' },
        mid: 's'
      },
      ji: {
        theme: '伤官见官之日——才气顶撞规矩，锋刃宜入鞘',
        s: { yi: '适合把不满写成建设性方案，而不是当面顶', ji: '留意与上级、规则硬碰硬——「伤官见官」古人再三叮嘱' },
        w: { yi: '适合把情绪写下来放一晚，明天再发', ji: '留意口舌是非与冲动辞职式发言' },
        mid: 's'
      },
      ping: { theme: '巧思之日——聪明够用，别炫技', yi: '适合优化改良，给旧事换个新做法', ji: '留意挑剔别人成果的冲动' }
    },
    正财: {
      xi: {
        theme: '落地生财之日——一分耕耘看得见一分收获',
        s: { yi: '适合处理钱与实务：记账、签约、采买、跟单', ji: '留意贪多求快——正财之厚在不取巧' },
        w: { yi: '适合小额稳妥的进项与整理资产，不加杠杆', ji: '留意为财耗身：钱要赚，觉也要睡' },
        mid: 's'
      },
      ji: {
        theme: '财多身乏之日——事务缠身，先分轻重',
        s: { yi: '适合集中清一类杂务，清完即止', ji: '留意贪掌控：什么都要管，反而都管不好' },
        w: { yi: '适合列清单排优先级，只做最重要的三件', ji: '留意为小钱小事透支精力——「财多身弱，富屋贫人」' },
        mid: 'w'
      },
      ping: { theme: '守成之日——账目清明，心里就稳', yi: '适合盘点与维护既有的东西', ji: '留意守得太紧错过该花的钱' }
    },
    偏财: {
      xi: {
        theme: '机遇流转之日——众人之财，靠人缘接住',
        s: { yi: '适合社交、拓展、谈机会——慷慨自有回响', ji: '留意来得快去得快，落袋才算数' },
        w: { yi: '适合经营一两段关键关系，不必广撒网', ji: '留意跟风投机——机会多时更要挑' },
        mid: 's'
      },
      ji: {
        theme: '财来分夺之日——机会带钩，看清再伸手',
        s: { yi: '适合审视手上的「好机会」，砍掉凑热闹的', ji: '留意帮人出头担保与冲动下注' },
        w: { yi: '适合守住现金流，只看不买', ji: '留意人情消费与碍于面子的应酬' },
        mid: 'w'
      },
      ping: { theme: '广结善缘之日——闲棋冷子，将来有用', yi: '适合回个消息、还个人情', ji: '留意把闲聊当承诺' }
    },
    正官: {
      xi: {
        theme: '名正言顺之日——规则是你的护城河',
        s: { yi: '适合办正事：申报、述职、对公沟通、立规矩', ji: '留意官气太足显得拘——办完正事给自己松绑' },
        w: { yi: '适合按流程走、借制度护身，让规则替你说话', ji: '留意主动揽责加码——守好本分即是功' },
        mid: 's'
      },
      ji: {
        theme: '规矩压身之日——束缚感重，守正而不硬扛',
        s: { yi: '适合把压力拆成条目，逐项按规矩清', ji: '留意与考核、审查较劲——今天不宜讨价还价' },
        w: { yi: '适合请示与备案：把责任放回该在的位置', ji: '留意独自硬扛压力——「印」是你的解药，去请教长辈师友' },
        mid: 'w'
      },
      ping: { theme: '安分之日——无功无过即是功', yi: '适合例行公事按部就班', ji: '留意小题大做的完美主义' }
    },
    七杀: {
      xi: {
        theme: '化煞为权之日——烈马有缰，正好驰骋',
        s: { yi: '适合攻坚：啃硬骨头、做决断、接挑战——今天压得住', ji: '留意杀伐太过伤和气，赢要赢得漂亮' },
        w: { yi: '适合借势攻一小点：找强援背书，打有把握之仗', ji: '留意同时开两条战线——集中一处才有胜算' },
        mid: 's'
      },
      ji: {
        theme: '压力上门之日——七杀无制则凶，配印配食可驯',
        s: { yi: '适合以「食」制杀：用专业输出消化压力', ji: '留意正面对抗与临时揽大事——烈马今天没缰' },
        w: { yi: '适合以「印」化杀：读书、请教、写复盘，退一步蓄力', ji: '留意硬碰硬与逞强熬夜——今天的猛劲会反噬' },
        mid: 'w'
      },
      ping: { theme: '悬而未决之日——压力在远处，不必迎上去', yi: '适合演练预案，把最坏情况想一遍', ji: '留意自己吓自己' }
    },
    正印: {
      xi: {
        theme: '得护之日——学有所进，贵人在侧',
        s: { yi: '适合梳理沉淀：把经验写成方法，教是最好的学', ji: '留意想得多做得少——印多易惰' },
        w: { yi: '适合充电与求助：读书、上课、找长辈师友聊', ji: '留意来者不拒地吸收——挑对源头再学' },
        mid: 'w'
      },
      ji: {
        theme: '荫蔽过厚之日——被照顾着，也被包裹着',
        s: { yi: '适合走出舒适区亲手做一件实事', ji: '留意依赖旧方法旧靠山——「印」今天会惯着你' },
        w: { yi: '适合休整，但给休整设期限', ji: '留意用「再准备准备」推迟行动' },
        mid: 's'
      },
      ping: { theme: '温养之日——静水深流', yi: '适合读几页书、整理笔记', ji: '留意信息囤积症' }
    },
    偏印: {
      xi: {
        theme: '偏才之日——冷门处见独到，孤静正是沃土',
        s: { yi: '适合钻研专精之事：技术、玄学、手艺，越冷越深越好', ji: '留意钻牛角尖——抬头透口气再扎回去' },
        w: { yi: '适合安静独处做一件小而深的事', ji: '留意多疑多虑——直觉可用，别反刍' },
        mid: 's'
      },
      ji: {
        theme: '枭神夺食之日——想得太多，吃不香睡不实',
        s: { yi: '适合把疑虑列出来逐条查证，用事实断多思', ji: '留意过度解读他人言行——今天的直觉带滤镜' },
        w: { yi: '适合动起来：散步、做饭、动手活，让身体接管', ji: '留意深夜复盘与自我怀疑——「柱中无食，只以偏印论」，没那么严重' },
        mid: 'w'
      },
      ping: { theme: '独思之日——一个人待着挺好', yi: '适合独立完成不被打扰的活', ji: '留意闭门造车忘了对齐' }
    }
  }

  // ———— 经典引句库（按 key 取池，dayOfYear 轮换；t=文，s=出处）————
  var QUOTES = {
    比肩: [
      { t: '喜比肩聚气相扶。', s: '穷通宝鉴·冬月之金' },
      { t: '得比肩则能助力。', s: '穷通宝鉴·秋月之土' },
      { t: '君子和而不同。', s: '论语·子路' }
    ],
    劫财: [
      { t: '阳刃有三：有劫财刃，有护禄刃，有背禄刃——刃非纯凶。', s: '三命通会·论阳刃' },
      { t: '财散人聚。', s: '古谚' },
      { t: '既以为人己愈有，既以与人己愈多。', s: '道德经·八十一章' }
    ],
    食神: [
      { t: '食神一名寿星，一名爵星。', s: '三命通会·论食神' },
      { t: '食神生旺，胜似财官。', s: '三命通会·论食神' },
      { t: '知足者富。', s: '道德经·三十三章' }
    ],
    伤官: [
      { t: '伤尽则能生财，财旺则能生官，造化展转有情。', s: '三命通会·论伤官' },
      { t: '伤官要见财，不要见官。', s: '三命通会·论伤官' },
      { t: '大直若屈，大巧若拙，大辩若讷。', s: '道德经·四十五章' }
    ],
    正财: [
      { t: '财为养命之源。', s: '三命通会·论正财' },
      { t: '财宜藏，藏则丰厚，露则浮荡。', s: '三命通会·论正财' },
      { t: '合抱之木，生于毫末；九层之台，起于累土。', s: '道德经·六十四章' }
    ],
    偏财: [
      { t: '偏财者，乃众人之财也。', s: '三命通会·论偏财' },
      { t: '主人慷慨，不甚吝财，与人有情。', s: '三命通会·论偏财' },
      { t: '将欲取之，必固与之。', s: '道德经·三十六章' }
    ],
    正官: [
      { t: '阴阳配合，相制有用，成其道也。', s: '三命通会·论正官' },
      { t: '官星有理会，所以贵也。', s: '滴天髓·何知章' },
      { t: '我无为而民自化，我好静而民自正。', s: '道德经·五十七章' }
    ],
    七杀: [
      { t: '有制谓之偏官，无制谓之七煞。', s: '三命通会·论偏官' },
      { t: '化鬼为官，化煞为权。', s: '三命通会·论偏官' },
      { t: '借小人势力卫护君子，以成威权。', s: '三命通会·论偏官' },
      { t: '祸兮福之所倚，福兮祸之所伏。', s: '道德经·五十八章' }
    ],
    正印: [
      { t: '印绶者，乃我气之源，为生气，为父母。', s: '三命通会·论印绶' },
      { t: '有印有官，方成厚福。', s: '三命通会·论印绶' },
      { t: '上善若水，水善利万物而不争。', s: '道德经·八章' }
    ],
    偏印: [
      { t: '柱中无食，只以偏印论——枭不必怕。', s: '三命通会·论倒食' },
      { t: '大智若愚，大音希声。', s: '道德经·四十一/四十五章' },
      { t: '知人者智，自知者明。', s: '道德经·三十三章' }
    ],
    调候: [
      { t: '调候为急，先救气候，再论扶抑。', s: '穷通宝鉴·法要' },
      { t: '高者抑之使平，下者举之使崇——贵在折衷，归於中道。', s: '穷通宝鉴·五行总论' },
      { t: '天道有寒暖，发育万物；人道行之，不可过也。', s: '滴天髓·寒暖' }
    ],
    中和: [
      { t: '既识中和之正理，而于五行之妙，有全能焉。', s: '滴天髓·中和' },
      { t: '万物负阴而抱阳，冲气以和。', s: '道德经·四十二章' },
      { t: '其相生也所以相维，其相克也所以相制，此之谓有伦。', s: '穷通宝鉴·五行总论' }
    ],
    闲: [
      { t: '一二闲神用去么，不用何妨莫动它。', s: '滴天髓·闲神' },
      { t: '致虚极，守静笃。', s: '道德经·十六章' }
    ]
  }

  function dayOfYear(d) {
    var dt = new Date(d.year, d.month - 1, d.day)
    return Math.floor((dt - new Date(d.year, 0, 0)) / 86400000)
  }
  function pickQuote(key, d) {
    var pool = QUOTES[key] || QUOTES['中和']
    return pool[dayOfYear(d) % pool.length]
  }

  // ———— 每日谶言 · 丞相奏对 ————
  // 体例仿推背图之「谶以取象」，但立场是宰辅进言而非判词：取象两句（随十神）+ 奏对一句（随顺逆）。
  // 非命定论——谶给意象，奏给建议，采纳与否，圣裁在君。
  var SS_VERSE = {
    比肩: [['同气连枝，并辔而行', '两骑同道，各执其缰'], ['山外有山，峰各自高', '并肩之力，可移一石']],
    劫财: [['风过群山，财帛有翼', '共伞之雨，让半肩宽'], ['两虎同林，先议其界', '豪气入市，袖里须有秤']],
    食神: [['仓廪既实，炊烟自暖', '果熟枝头，不摇自落'], ['小灶慢火，香在深巷', '一箪一瓢，其乐自足']],
    伤官: [['剑出新硎，寒光照人', '木秀于林，风必闻之'], ['锦心绣口，字字生辉', '利刃在手，宜雕不宜斫']],
    正财: [['犁深一寸，土自生金', '仓中有粟，心中有秤'], ['滴水归仓，涓涓成渠', '一砖一瓦，皆是来日']],
    偏财: [['财如流水，过手不驻', '四方来客，广厦纳之'], ['集市喧喧，机在人潮', '撒网易，收网见功夫']],
    正官: [['冠冕在堂，进退有度', '城有其墙，行有其道'], ['印信在手，一诺千钧', '直道而行，无须旁径']],
    七杀: [['烈马嘶风，缰在谁手', '虎踞门前，可骑可驯'], ['重兵压境，营中宜静', '雷霆在天，执伞者安']],
    正印: [['大树垂荫，书声在下', '泉出高山，饮者自清'], ['灯下展卷，字字养人', '有老者言，不可不听']],
    偏印: [['孤灯照卷，冷处开花', '井深水静，独见星光'], ['僻径通幽，人迹罕至', '一技入微，胜百艺之泛']]
  }
  var ZOU_VERSE = {
    tiaohou: [
      '臣观天时：久旱逢雨，枯苗立起——此对症之药，陛下宜尽用之。',
      '臣观天时：雪中送炭，火候正好——谋之已久者，宜于今日行之。'
    ],
    xi: [
      '臣启陛下：东风既至，水到渠成——宜扬帆，勿迟疑，亦留三分余地。',
      '臣启陛下：贵人执灯，道路自明——可进一步；功成之处，让人半步。'
    ],
    ping: [
      '臣启陛下：云淡风轻，朝野无事——守常即可，不必兴兵，宜养精神。',
      '臣启陛下：水波不惊，各安其位——无为亦是治，静待其时。'
    ],
    ji: [
      '臣启陛下：逆风行船，帆宜半落——今日缓一步，即是进一步。',
      '臣启陛下：霜重路滑，辔宜轻勒——宜守成，莫开新局；忍一时之快，保十日之功。'
    ]
  }
  // 谶言：取象随十神轮换，奏对随顺逆轮换；同日稳定、隔日不同
  function zhenYan(ss, hit, d) {
    var vs = SS_VERSE[ss] || SS_VERSE['比肩']
    var doy = dayOfYear(d)
    var chen = vs[doy % vs.length]
    var zpool = ZOU_VERSE[hit] || ZOU_VERSE.ping
    var zou = zpool[doy % zpool.length]
    return { chen: chen, zou: zou }
  }

  // ———— 顺逆判定：流日干支都算（干 0.6 / 支主气 0.4）————
  // 调候命中从严：流日天干【正是】调候用神那个字（穷通判词首选字最准）才给鎏金标，五行同类不算。
  function dayHit(yong, ganEl, zhiEl, ganChar) {
    if (!yong) return null
    function sc(el) {
      if (yong.favorable && yong.favorable.indexOf(el) >= 0) return 1
      if (yong.unfavorable && yong.unfavorable.indexOf(el) >= 0) return -1
      return 0
    }
    var score = 0.6 * sc(ganEl) + 0.4 * sc(zhiEl)
    var hit = score > 0.15 ? 'xi' : score < -0.15 ? 'ji' : 'ping'
    if (ganChar && yong.tiaohouYong && yong.tiaohouYong.indexOf(ganChar) >= 0) hit = 'tiaohou'
    return { hit: hit, score: Math.round(score * 100) / 100 }
  }

  // 万年历打点（轻量：只查五行表，不排全盘）
  function dayScore(gan, zhi, yong) {
    var h = dayHit(yong, E.GAN_WUXING[gan], E.ZHI_WUXING[zhi], gan)
    return h ? h.hit : 'ping'
  }

  var HIT_CN = { tiaohou: '调候', xi: '顺', ping: '平', ji: '留意' }

  // ———— 五行能量谱 ————
  // 当日环境之气的定量分布：流日 0.5 / 流月 0.3 / 流年 0.2；每柱 干 0.6 + 支藏干 0.4（本中余 1/0.5/0.3 归一）；
  // 再乘「月令旺相休囚死」季节系数（旺 1.25 / 相 1.1 / 休 0.9 / 囚 0.75 / 死 0.6），归一成百分比谱。
  // 投影：喜用占比 − 忌神占比，除以 50 → [-1,1]，是「五行能量」因子。
  var CANG_W = [1, 0.5, 0.3]
  var SEASON_F = { 旺: 1.25, 相: 1.1, 休: 0.9, 囚: 0.75, 死: 0.6 }
  function wangShuaiOf(el, ruler) {
    if (el === ruler) return '旺'
    if (E.generates(ruler, el)) return '相'
    if (E.generates(el, ruler)) return '休'
    if (E.controls(el, ruler)) return '囚'
    return '死'
  }
  function energyProfile(day, yong) {
    var e = { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 }
    var layers = [
      { gan: day.liuriGan, zhi: day.liuriZhi, w: 0.5 },
      { gan: day.liuyueGan, zhi: day.liuyueZhi, w: 0.3 },
      { gan: day.liunianGan, zhi: day.liunianZhi, w: 0.2 }
    ]
    layers.forEach(function (L) {
      e[E.GAN_WUXING[L.gan]] += 0.6 * L.w
      var cang = (E.ZHI_CANG[L.zhi] || '').split('')
      var tot = 0
      cang.forEach(function (_, i) { tot += CANG_W[i] || 0.3 })
      cang.forEach(function (g, i) { e[E.GAN_WUXING[g]] += 0.4 * L.w * (CANG_W[i] || 0.3) / tot })
    })
    var ruler = E.ZHI_WUXING[day.liuyueZhi]
    var seasons = {}
    var sum = 0
    ;['木', '火', '土', '金', '水'].forEach(function (w) {
      seasons[w] = wangShuaiOf(w, ruler)
      e[w] *= SEASON_F[seasons[w]]
      sum += e[w]
    })
    var pct = {}
    ;['木', '火', '土', '金', '水'].forEach(function (w) { pct[w] = Math.round(e[w] / sum * 1000) / 10 })
    var proj = 0
    if (yong && yong.favorable && (yong.favorable.length || yong.unfavorable.length)) {
      var fav = 0, unf = 0
      yong.favorable.forEach(function (w) { fav += pct[w] })
      yong.unfavorable.forEach(function (w) { unf += pct[w] })
      proj = Math.max(-1, Math.min(1, (fav - unf) / 50))
    }
    return { pct: pct, proj: Math.round(proj * 100) / 100, ruler: ruler, seasons: seasons }
  }

  // ———— 化机指数 v2（0–100 参考指数，50=中平）————
  // 五因子合成：流日契合 32% + 五行能量 20% + 层运共振 22% + 合冲动静 16% + 紫微流曜 10%；调候日 +6。
  // 紫微流曜 = 流日天干四化（禄权科忌）落入命宫三方四正的影响（需紫微盘，缺则该权重并回流日契合）。
  // 命名去恐吓化：昂扬/顺畅/平稳/收敛/蛰养——无「凶」字。
  var IDX_BAND = [
    { min: 72, name: '昂扬', advice: '宜进取——把最重要的事排给今天' },
    { min: 58, name: '顺畅', advice: '宜从容推进，顺水行舟' },
    { min: 43, name: '平稳', advice: '宜照常，守住节奏即是功' },
    { min: 29, name: '收敛', advice: '宜少动多察，大事往后排一排' },
    { min: 0, name: '蛰养', advice: '宜蛰伏养气，只做必要之事' }
  ]
  function relMotion(rels) {
    var v = 0
    rels.forEach(function (r) {
      if (r.type === '三合' || r.type === '三会') v += 0.4
      else if (r.type === '合' || r.type === '五合') v += 0.25
      else if (r.type === '冲') v -= 0.3
      else if (r.type === '刑' || r.type === '害') v -= 0.15
      else if (r.type === '破') v -= 0.1
    })
    return Math.max(-1, Math.min(1, v))
  }
  // opts（可选）：{ zw: 紫微盘（Ziwei.buildFromBirth 产物）, epochGz: 时代层干支（如 BTC 用三元九运「丙午」替代个人大运） }
  function dayIndex(chart, st, yong, day, opts) {
    if (!chart || !yong) return null
    var I = root.Interpret
    var fit = dayHit(yong, E.GAN_WUXING[day.liuriGan], E.ZHI_WUXING[day.liuriZhi], day.liuriGan)
    var isTH = fit.hit === 'tiaohou'
    var fitS = isTH ? Math.max(fit.score, 0.6) : fit.score
    function hs(gan, zhi) { var h = dayHit(yong, E.GAN_WUXING[gan], E.ZHI_WUXING[zhi], gan); return h.hit === 'tiaohou' ? 1 : h.score }
    var detail = { liunian: hs(day.liunianGan, day.liunianZhi), liuyue: hs(day.liuyueGan, day.liuyueZhi), dayun: null }
    if (opts && opts.epochGz) detail.dayun = hs(opts.epochGz[0], opts.epochGz[1])
    else {
      var cur = E.currentDaYun(chart, day.year)
      if (cur && cur.ganZhi) detail.dayun = hs(cur.ganZhi[0], cur.ganZhi[1])
    }
    var lay = [detail.liunian, detail.liuyue]
    if (detail.dayun !== null) lay.push(detail.dayun)
    var layS = lay.reduce(function (a, b) { return a + b }, 0) / lay.length
    var rels = I && I.mergedDayRelations ? I.mergedDayRelations(chart, day).relations : []
    var motion = relMotion(rels)
    var en = energyProfile(day, yong)
    var zwFlow = null
    if (opts && opts.zw && root.Ziwei) zwFlow = root.Ziwei.flowSiHua(opts.zw, day.liuriGan)
    var raw = zwFlow
      ? 0.32 * fitS + 0.2 * en.proj + 0.22 * layS + 0.16 * motion + 0.1 * zwFlow.score
      : 0.42 * fitS + 0.2 * en.proj + 0.22 * layS + 0.16 * motion
    var score = Math.round(50 + raw * 46 + (isTH ? 6 : 0))
    score = Math.max(6, Math.min(97, score))
    var band = IDX_BAND[IDX_BAND.length - 1]
    for (var i = 0; i < IDX_BAND.length; i++) { if (score >= IDX_BAND[i].min) { band = IDX_BAND[i]; break } }
    function r2(x) { return Math.round(x * 100) / 100 }
    return {
      score: score, band: band.name, advice: band.advice,
      parts: {
        fit: r2(fitS), energy: en.proj, layers: r2(layS), motion: r2(motion),
        ziwei: zwFlow ? r2(zwFlow.score) : null, tiaohou: isTH,
        layerDetail: { dayun: detail.dayun === null ? null : r2(detail.dayun), liunian: r2(detail.liunian), liuyue: r2(detail.liuyue) }
      },
      energy: en, zwFlow: zwFlow,
      relCount: rels.length
    }
  }
  // ———— 化机分维：财运 / 事业 / 情感 / 出行·迁移 / 学养 + 今日事项（并入黄历宜忌）————
  // 分维 = 总指数为底（55%）向中回拉（45%），再按「该维五行能量 + 流日十神 + 宫位/神煞触发 + 黄历事项」微调。
  // 黄历宜忌（通用千人一面）在此只作事项层的「顺水推舟/逆水缓行」小权重，个人盘仍是主轴。
  var YIMA = [2, 11, 8, 5] // 申子辰→寅 巳酉丑→亥 寅午戌→申 亥卯未→巳（以日支起，取「自身行动」之义）
  var ZHI_SEQ = '子丑寅卯辰巳午未申酉戌亥'
  // 黄历事项 → 白话（白名单；未列入者不展示，保持素静）
  var FOLK_CN = {
    交易: '签约交易', 立券: '订立合同', 纳财: '进财收款', 开市: '开张开市', 开仓: '出货开仓',
    出行: '出行远行', 移徙: '搬家迁居', 入宅: '入住新居', 安床: '安床布置',
    嫁娶: '婚嫁喜事', 订盟: '定亲订约', 纳采: '提亲说媒', 会亲友: '会见亲友',
    祭祀: '祭祖祈福', 祈福: '祈福静心', 入学: '入学开课', 习艺: '拜师习艺',
    动土: '装修动土', 盖屋: '修缮房屋', 求医: '就医调理', 栽种: '栽种莳花'
  }
  var DIM_DEF = [
    { key: 'cai', name: '财运', folk: ['交易', '立券', '纳财', '开市', '开仓'] },
    { key: 'shiye', name: '事业', folk: ['开市', '立券', '动土', '盖屋'] },
    { key: 'qinggan', name: '情感', folk: ['嫁娶', '订盟', '纳采', '会亲友', '安床'] },
    { key: 'chuxing', name: '出行', folk: ['出行', '移徙', '入宅'] },
    { key: 'xueyang', name: '学养', folk: ['入学', '习艺', '祭祀', '祈福'] }
  ]
  function elOfGroup(dmEl, want) {
    var els = ['木', '火', '土', '金', '水']
    for (var i = 0; i < 5; i++) {
      var e = els[i]
      if (want === '财' && E.controls(dmEl, e)) return e
      if (want === '官杀' && E.controls(e, dmEl)) return e
      if (want === '印' && E.generates(e, dmEl)) return e
      if (want === '食伤' && E.generates(dmEl, e)) return e
    }
    return dmEl
  }
  function dimLabel(v) { return v >= 62 ? '顺' : v >= 45 ? '平' : '缓' }
  function dayDims(chart, st, yong, day, opts) {
    var ix = dayIndex(chart, st, yong, day, opts)
    if (!ix) return null
    var I = root.Interpret
    var dm = chart.dayMaster.wuxing
    var pct = ix.energy.pct
    var ssGroup = E.SHISHEN_GROUP[E.shiShen(chart.dayMaster.gan, day.liuriGan)]
    var rels = I && I.mergedDayRelations ? I.mergedDayRelations(chart, day).relations : []
    // 夫妻宫（日支）触动 与 全盘动象
    var spouse = 0, anyChong = false
    rels.forEach(function (r) {
      if (r.type === '冲') anyChong = true
      if (r.members.indexOf('day') < 0) return
      if (r.kind === 'gan') { spouse += r.type === '五合' ? 6 : 0; return }
      if (r.type === '合' || r.type === '三合' || r.type === '三会') spouse += 8
      else if (r.type === '冲') spouse -= 8
      else if (r.type === '刑' || r.type === '害') spouse -= 6
      else if (r.type === '破') spouse -= 3
    })
    // 驿马（日支三合）· 红鸾天喜（紫微盘）
    var dayZhiIdx = ZHI_SEQ.indexOf(chart.pillars.day.zhi)
    var liuriZhiIdx = ZHI_SEQ.indexOf(day.liuriZhi)
    var yima = YIMA[dayZhiIdx % 4] === liuriZhiIdx
    var luanXi = false
    if (opts && opts.zw && root.Ziwei) {
      var lz = root.Ziwei.starZhi(opts.zw, '红鸾'), xz = root.Ziwei.starZhi(opts.zw, '天喜')
      luanXi = liuriZhiIdx === lz || liuriZhiIdx === xz
    }
    var yiSet = day.yi || [], jiSet = day.ji || []
    function folkAdj(keys) {
      var v = 0
      keys.forEach(function (k) { if (yiSet.indexOf(k) >= 0) v += 3; if (jiSet.indexOf(k) >= 0) v -= 3 })
      return Math.max(-6, Math.min(6, v))
    }
    function mk(adj, folkKeys) {
      var v = Math.round(ix.score * 0.55 + 50 * 0.45 + adj + folkAdj(folkKeys))
      v = Math.max(5, Math.min(98, v))
      return { score: v, label: dimLabel(v) }
    }
    var eCai = elOfGroup(dm, '财'), eGuan = elOfGroup(dm, '官杀'), eYin = elOfGroup(dm, '印')
    var dims = {
      cai: mk((pct[eCai] - 20) * 0.4 + (ssGroup === '财' ? 9 : ssGroup === '比劫' ? -7 : 0), DIM_DEF[0].folk),
      shiye: mk((pct[eGuan] - 20) * 0.3 + (pct[eYin] - 20) * 0.15 + (ssGroup === '官杀' ? 8 : ssGroup === '印' ? 4 : 0), DIM_DEF[1].folk),
      qinggan: mk(spouse + (luanXi ? 8 : 0) + (ssGroup === '食伤' ? 3 : 0), DIM_DEF[2].folk),
      chuxing: mk((yima ? 10 : 0) + (anyChong ? 4 : 0) + (ssGroup === '比劫' ? 3 : 0), DIM_DEF[3].folk),
      xueyang: mk((pct[eYin] - 20) * 0.4 + (ssGroup === '印' ? 8 : ssGroup === '食伤' ? 4 : 0), DIM_DEF[4].folk)
    }
    // 今日事项：黄历白名单 × 分维顺逆 → 宜（该维不缓）/ 缓（该维偏缓或黄历所忌）
    var yi = [], huan = [], seen = {}
    function dimOfFolk(k) {
      for (var i = 0; i < DIM_DEF.length; i++) { if (DIM_DEF[i].folk.indexOf(k) >= 0) return dims[DIM_DEF[i].key] }
      return null
    }
    yiSet.forEach(function (k) {
      var cn = FOLK_CN[k]
      if (!cn || seen[cn]) return
      var dv = dimOfFolk(k)
      if (dv && dv.score < 45) return // 黄历虽宜、个人偏缓 → 不入宜
      seen[cn] = 1; yi.push(cn)
    })
    jiSet.forEach(function (k) {
      var cn = FOLK_CN[k]
      if (!cn || seen[cn]) return
      seen[cn] = 1; huan.push(cn)
    })
    // 个人维度补充：最旺维给一条顺水事，最缓维给一条缓行事
    var DIM_YI = { cai: '理财对账', shiye: '推进正事', qinggan: '经营关系', chuxing: '出行走动', xueyang: '读书充电' }
    var DIM_HUAN = { cai: '大额支出', shiye: '硬碰交涉', qinggan: '翻旧账', chuxing: '远途搬迁', xueyang: '囤而不读' }
    var best = null, worst = null
    DIM_DEF.forEach(function (d) {
      if (!best || dims[d.key].score > dims[best].score) best = d.key
      if (!worst || dims[d.key].score < dims[worst].score) worst = d.key
    })
    if (dims[best].score >= 55 && yi.indexOf(DIM_YI[best]) < 0) yi.unshift(DIM_YI[best])
    if (dims[worst].score < 45 && huan.indexOf(DIM_HUAN[worst]) < 0) huan.unshift(DIM_HUAN[worst])
    return { ix: ix, dims: dims, dimOrder: DIM_DEF, yi: yi.slice(0, 3), huan: huan.slice(0, 3) }
  }

  // 顺逆一句话（含调候/中和特判）
  function hitLine(hit, ganEl, yong) {
    if (hit === 'tiaohou') return '今日之气（' + ganEl + '）正是你的调候用神——最对症，宜借力（穷通宝鉴：调候为急）。'
    if (hit === 'xi') return '今日之气（' + ganEl + '）落在你的喜用——顺，宜主动一些、借势推进。'
    if (hit === 'ji') return '今日之气（' + ganEl + '）偏你的忌神——留意，宜守、宜缓，不必强求。'
    if (yong && yong.balanced) return '命局中和，今日之气平平——贵在流通，照常即可。'
    return '今日之气（' + ganEl + '）在你喜忌之外——平，照常即可。'
  }

  // ———— 组合出当日文案 ————
  // 返回 { ss, group, hit, hitCn, hitText, theme, yi, ji, quote, ganNote, tone }
  function dailyText(chart, st, yong, day) {
    var dm = chart.dayMaster
    var ss = E.shiShen(dm.gan, day.liuriGan)
    var ganEl = E.GAN_WUXING[day.liuriGan], zhiEl = E.ZHI_WUXING[day.liuriZhi]
    var h = dayHit(yong, ganEl, zhiEl, day.liuriGan) || { hit: 'ping', score: 0 }
    var hit = h.hit
    var m = M[ss]
    var lvl = hit === 'tiaohou' ? 'xi' : hit // 调候日取「顺」矩阵，另加调候引句
    var cell = m[lvl] || m.ping
    var sKey = !st ? 'mid' : /强/.test(st.label) ? 's' : /弱/.test(st.label) ? 'w' : 'mid'
    var texts
    if (lvl === 'ping') texts = { yi: cell.yi, ji: cell.ji }
    else {
      var use = sKey === 'mid' ? cell.mid : sKey
      texts = cell[use] || cell.s
    }
    var quoteKey = hit === 'tiaohou' ? '调候' : hit === 'ping' ? (yong && yong.balanced ? '中和' : ss) : ss
    var quote = pickQuote(quoteKey, day)
    var group = E.SHISHEN_GROUP[ss]
    var tone
    if (group === '比劫' || group === '食伤') tone = '偏外放 —— 适合主动、表达、行动'
    else if (group === '官杀') tone = '偏收敛 —— 宜稳、守规、担正事'
    else if (group === '印') tone = '偏内蓄 —— 宜静、学习、养精神'
    else tone = '偏务实 —— 宜落地、理事、经营'

    return {
      ss: ss, group: group, hit: hit, hitCn: HIT_CN[hit], score: h.score,
      hitText: hitLine(hit, ganEl, yong),
      theme: cell.theme, yi: texts.yi, ji: texts.ji,
      quote: quote, ganNote: GAN_NOTE[day.liuriGan], tone: tone,
      zhen: zhenYan(ss, hit, day)
    }
  }

  // ———— 悬停贴士（专业名词两段式：通义 + 于你·臣曰）————
  // what = 词本身的含义；you = 结合使用者八字的解读；chen = 大臣奏对式一句建议（谶喻语气，非判词）
  var HINT_BASE = {
    调候日: {
      what: '《穷通宝鉴》按「日主×月令」开出最对症的用神字（如夏火需壬癸润、冬金需丙丁暖）。流日天干恰是此字，谓之调候日——久旱逢的正是雨，雪中送的正是炭。',
      chen: '臣启陛下：调候之日，天赐之药，谋之已久者，宜于此日行之。'
    },
    顺: {
      what: '流日之气（干支合计）落在你的喜用五行——势顺水行舟，是宜主动、宜推进的日子。',
      chen: '臣启陛下：东风既至，可扬帆，勿迟疑；功成处，让人半步。'
    },
    平: {
      what: '流日之气在你的喜忌之外，或干支顺逆相抵——不助不碍的平常日。',
      chen: '臣启陛下：云淡风轻，朝野无事——守常即可，静亦是治。'
    },
    留意: {
      what: '流日之气偏你的忌神——非凶日，是「逆风日」：风不由人，帆可由己，宜守宜缓。',
      chen: '臣启陛下：霜重路滑，辔宜轻勒——今日缓一步，即是进一步。'
    },
    化机指数: {
      what: '把一天的能量合成 0–100 的参考指数（50=中平），五因子加权：流日契合 32%、五行能量谱 20%（流日/流月/流年之气含藏干、乘月令旺衰，对照你的喜忌）、大运流年流月层运共振 22%、当日合冲动静 16%、紫微流曜 10%（流日天干四化落命宫三方四正）；调候日另 +6。分档：昂扬≥72 / 顺畅 / 平稳 / 收敛 / 蛰养。',
      chen: '臣启陛下：指数是参谋之尺，非吉凶之判——高时借势而行，低时敛锋养锐。'
    },
    五行能量: {
      what: '当日环境之气的定量分布：流日占五成、流月三成、流年两成，天干与地支藏干皆计，再按月令旺相休囚死加权，归一成五行百分比谱。你的喜用占比减忌神占比，即是「五行能量」因子。',
      chen: '臣启陛下：气有厚薄，时有旺衰——观谱知势，借厚而行。'
    },
    化机分维: {
      what: '把总指数按事项拆成五维：财运（财星五行能量+流日十神）、事业（官杀与印）、情感（夫妻宫合冲+红鸾天喜）、出行（驿马与动象，含搬家迁居）、学养（印星能量）。各维以总指数为底、向中回拉再微调，并轻度并入当日黄历宜忌——个人盘为主轴，黄历只作顺水逆水的小权重。分档：顺≥62 / 平 / 缓<45。',
      chen: '臣启陛下：一日之气，各司不同——问事择其旺处行，缓处不必强求。'
    },
    紫微流曜: {
      what: '紫微斗数的流日视角：流日天干引动四化（禄权科忌），看化星落入命宫三方四正（命/财帛/官禄/迁移）与否——禄权科入垣为助，忌星入垣宜缓。安星依《紫微斗数全书》通行诀。',
      chen: '臣启陛下：星垣如朝堂，禄至则贺，忌至则谨——皆一日之客，非终身之判。'
    },
    身强: { what: '得月令、多帮扶，日主之气偏旺——旺则宜泄宜伤（滴天髓），能扛事，喜克泄耗来「用」你。', chen: '臣启陛下：兵强马壮，宜出而任事，忌闭门自雄。' },
    身弱: { what: '失月令、帮扶少，日主之气偏柔——衰则喜帮喜助（滴天髓），宜借力，印比是你的粮草。', chen: '臣启陛下：兵微将寡，宜结盟借势，忌孤军深入。' },
    中和: { what: '帮耗大致相当，命贵中和（滴天髓）——无显著喜忌，贵在流通，顺其自然。', chen: '臣启陛下：政通人和，不必兴革，护此平衡即是功。' }
  }
  // 臣曰 · 按喜忌状态的短奏（十神/五行个性化贴士的第二句）
  var CHEN_BY_STATUS = {
    tiaohou: '臣曰：此陛下之良药也，逢之宜尽用之。',
    xi: '臣曰：此陛下之顺风也，逢之宜借势而行。',
    ji: '臣曰：此气于陛下偏逆，逢之宜守缓、宜借力化之。',
    ping: '臣曰：此气于陛下无碍，平常心待之即可。'
  }
  // 某五行相对用户的喜忌状态
  function elStatus(el, yong) {
    if (!yong) return null
    if (yong.tiaohouEl && yong.tiaohouEl.indexOf(el) >= 0 && yong.favorable.indexOf(el) >= 0) return 'tiaohou'
    if (yong.favorable && yong.favorable.indexOf(el) >= 0) return 'xi'
    if (yong.unfavorable && yong.unfavorable.indexOf(el) >= 0) return 'ji'
    return 'ping'
  }
  var STATUS_CN = { tiaohou: '调候要角', xi: '喜用', ji: '忌神', ping: '喜忌之外' }
  // 反查：某十神对应日主的哪个天干（如辛日主的七杀=丁）
  function ganOfShiShen(dm, ss) {
    var out = []
    '甲乙丙丁戊己庚辛壬癸'.split('').forEach(function (g) { if (E.shiShen(dm, g) === ss) out.push(g) })
    return out
  }
  // 一柱干支的五行流向短评（干支同气/相生/相克）
  function gzFlow(ge, ze) {
    if (ge === ze) return '干支同气，通根气专。'
    if (E.generates(ge, ze)) return ge + '生' + ze + '，干气顺行下济。'
    if (E.generates(ze, ge)) return ze + '生' + ge + '，得根滋养，气从下起。'
    if (E.controls(ge, ze)) return ge + '克' + ze + '，上制其下（坐财之象）。'
    if (E.controls(ze, ge)) return ze + '克' + ge + '，下拂其上（坐杀之象），宜受其磨。'
    return ''
  }
  // 悬停贴士组装：kind ∈ hint(顺逆词)/gzwx(干支五行徽记)/shishen/wuxing/terms…；ctx = { chart, st, yong }
  function termHint(kind, key, ctx) {
    var chart = ctx && ctx.chart, st = ctx && ctx.st, yong = ctx && ctx.yong
    if (kind === 'gzwx' && key && key.length >= 2) {
      var gan = key[0], zhi = key[1], zm = E.ZHI_MAIN[zhi]
      if (!E.GAN_WUXING[gan] || !zm) return null
      var ge = E.GAN_WUXING[gan], ze = E.GAN_WUXING[zm]
      var gy = E.GAN_YINYANG[gan], zy = E.GAN_YINYANG[zm]
      var combo = ge === ze ? ((gy !== zy ? '阴阳' : gy === '阳' ? '双阳' : '双阴') + ge + '并见') : ge + ze + '同柱'
      var what = gan + ' = ' + gy + ge + '（' + (GAN_NOTE[gan] ? GAN_NOTE[gan].shi.slice(0, 4) : '') + '），' +
        zhi + ' 藏' + zm + ' = ' + zy + ze + (GAN_NOTE[zm] ? '（' + GAN_NOTE[zm].shi.slice(0, 4) + '）' : '') +
        '——' + combo + '。' + gzFlow(ge, ze)
      var you4 = '', chen4 = ''
      if (yong) {
        var s1 = elStatus(ge, yong), s2 = elStatus(ze, yong)
        you4 = '于你：' + ge + '属' + STATUS_CN[s1] + (ze !== ge ? '，' + ze + '属' + STATUS_CN[s2] : '') + '。'
        var dom = s1 === 'tiaohou' || s2 === 'tiaohou' ? 'tiaohou' : s1
        chen4 = CHEN_BY_STATUS[dom]
      }
      return { what: what, you: you4, chen: chen4 }
    }
    if (kind === 'hint') {
      var h = HINT_BASE[key]
      // 紫微星曜 / 宫位贴士回落（数据在 Ziwei 引擎里，按需取用）
      if (!h && root.Ziwei) {
        if (root.Ziwei.STAR_NOTE[key]) h = { what: root.Ziwei.STAR_NOTE[key], chen: '臣曰：星无善恶，成败在驾驭——观其两面，用其所长。' }
        else if (root.Ziwei.PALACE_NOTE[key]) h = { what: key + '：' + root.Ziwei.PALACE_NOTE[key] + '。十二宫如朝中十二司，各有所掌。', chen: '' }
      }
      if (!h) return null
      var you = ''
      if (yong && key === '调候日') you = '于你：调候用神为「' + (yong.tiaohouYong || []).join('') + '」——流日天干逢此字即是。'
      else if (yong && key === '顺') you = '于你：喜用为 ' + (yong.favorable.join('') || '（中和无显著喜用）') + '。'
      else if (yong && key === '留意') you = '于你：忌神为 ' + (yong.unfavorable.join('') || '（中和无显著忌神）') + '。'
      else if (yong && key === '平' && yong.balanced) you = '于你：命局中和，多数日子皆平——贵在流通。'
      return { what: h.what, you: you, chen: h.chen }
    }
    if (kind === 'shishen' && root.Knowledge && root.Knowledge.shishen[key]) {
      var s = root.Knowledge.shishen[key]
      var you2 = '', chen2 = ''
      if (chart && yong) {
        var gans = ganOfShiShen(chart.dayMaster.gan, key)
        var el = gans.length ? E.GAN_WUXING[gans[0]] : null
        if (el) {
          var stt = elStatus(el, yong)
          you2 = '于你（日主' + chart.dayMaster.gan + chart.dayMaster.wuxing + '）：' + key + ' 是 ' + gans.join('') + el + '，属你的' + STATUS_CN[stt] + '。'
          chen2 = CHEN_BY_STATUS[stt]
        }
      }
      return { what: s.oneLine, you: you2, chen: chen2 }
    }
    if (kind === 'wuxing' && root.Knowledge && root.Knowledge.wuxing[key]) {
      var w = root.Knowledge.wuxing[key]
      var you3 = '', chen3 = ''
      if (chart && yong) {
        var stt3 = elStatus(key, yong)
        you3 = '于你：盘中' + key + '有 ' + (chart.wuxingCount[key] || 0) + ' 见，属你的' + STATUS_CN[stt3] + '。'
        chen3 = CHEN_BY_STATUS[stt3]
      }
      return { what: w.oneLine, you: you3, chen: chen3 }
    }
    if (kind === 'relations' && root.Knowledge && root.Knowledge.relations[key]) {
      return { what: root.Knowledge.relations[key].oneLine, you: '', chen: '' }
    }
    if (kind === 'terms' && root.Knowledge && root.Knowledge.terms[key]) {
      return { what: root.Knowledge.terms[key], you: '', chen: '' }
    }
    if (kind === 'bagua' && root.Knowledge && root.Knowledge.bagua[key]) {
      return { what: root.Knowledge.bagua[key].oneLine, you: '', chen: '' }
    }
    return null
  }

  var Daily = {
    dailyText: dailyText, dayHit: dayHit, dayScore: dayScore, dayIndex: dayIndex,
    energyProfile: energyProfile, dayDims: dayDims,
    pickQuote: pickQuote, zhenYan: zhenYan, termHint: termHint, HIT_CN: HIT_CN,
    M: M, QUOTES: QUOTES, GAN_NOTE: GAN_NOTE, SS_VERSE: SS_VERSE, ZOU_VERSE: ZOU_VERSE,
    HINT_BASE: HINT_BASE
  }
  root.Daily = Daily
  if (typeof module !== 'undefined' && module.exports) module.exports = Daily
})(typeof window !== 'undefined' ? window : globalThis)
