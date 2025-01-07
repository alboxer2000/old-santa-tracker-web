/**
 * @fileoverview Runtime information for Santa Tracker's scenes.
 */

// nb. This module expects to just export a single dictionary, wrapped in parenthesis. The build
// system (which runs in Node) also parses this code, but needs to remove the ES6 module syntax.
export default ({
  airport: {},
  blimp: {},
  boatload: {
    view: 'landscape',
  },
  briefing: {},
  citylights: {},
  codeboogie: {
    view: 'portrait',
  },
  codelab: {
    view: 'portrait',
  },
  commandcentre: {},
  educators: {
    msgid: 'educators',
    scroll: true,
  },
  elfski: {},
  factory: {},
  glider: {
    view: 'landscape',
  },
  gumball: {
    view: 'landscape',
  },
  icecave: {},
  island: {},
  jamband: {
    view: 'landscape',
  },
  jetpack: {},
  latlong: {
    view: 'portrait',
  },
  matching: {
    view: 'landscape',
  },
  mercator: {
    view: 'landscape',
  },
  penguindash: {
    msgid: 'scene_dash',
    view: 'fixed',
  },
  playground: {},
  poseboogie: {
    view: 'portrait',
  },
  postcard: {},
  presentbounce: {
    view: 'landscape',
  },
  presentdrop: {
    view: 'landscape',
  },
  press: {
    msgid: 'press',
    scroll: true,
  },
  speedsketch: {},
  racer: {},
  rollercoaster: {},
  runner: {
    view: 'landscape',
  },
  santascanvas: {
    msgid: 'scene_canvas',
    view: 'portrait',
  },
  santasearch: {},
  santaselfie: {},
  seasonofgiving: {
    view: 'portrait',
  },
  smatch: {
    msgid: 'scene_giftmatch',
  },
  snowball: {},
  snowflake: {
    msgid: 'scene_postcard',
    view: 'landscape',
  },
  streetview: {},
  tracker: {
    msgid: 'tracker_track',
  },
  traditions: {},
  translations: {},
  trivia: {},
  undersea: {},
  windtunnel: {},
  wrapbattle: {
    msgid: 'scene_wrap',
  },

// videos

  carpool: {video: 'h83b1lWPuvQ'},
  comroom: {video: '_WdYujHlmHA'},
  jingle: {video: 'sQnKCU_A0Yc'},
  liftoff: {video: 'BfF7vfw6Zjw'},  // 2013
  museum: {video: 'fo25RcjXJI4'},
  office: {video: 'IXmDOu-eSx4'},
  onvacation: {video: 'IdpQSy4IB_I'},
  reindeerworries: {video: 'nXLNcfNsWAY'},  // 2015
  reload: {video: 'vHMeXs36NTE'},
  santasback: {video: 'zE_D9Vd69aw'},
  satellite: {video: 'ZJPL56IPTjw'},
  selfies: {video: 'JA8Jn5DGt64'},
  slackingoff: {video: 'uEl2WIZOVdQ'},
  takeoff: {video: 'YNpwm08ZRD0'},  // 2015+
  temptation: {video: '2FtcJJ9vzVQ'},
  tired: {video: '2UGX3bT9u20'},
  wheressanta: {video: '0qrFL0mn3Uk'},  // 2013
  workshop: {video: 'oCAKV4Ikhec'},  // 2014

// dummy: used for prod demos

  somebodypleasethinkofthechildren: {msgid: 'wrapbattle_feedback_perfect'},
});