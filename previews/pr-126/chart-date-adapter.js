/* global Chart */
'use strict';

// ============================================================
// Minimal Chart.js 4.x date adapter (no external dependencies)
// Loaded after chart.umd.js; required for the time-scale x-axis.
// Supports the month-level granularity used by tokenChart.
// ============================================================

(function () {
  if (typeof Chart === 'undefined' || !Chart._adapters) return;

  var MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  var MS = {
    millisecond: 1,
    second:      1000,
    minute:      60000,
    hour:        3600000,
    day:         86400000,
    week:        604800000,
  };

  Chart._adapters._date.override({

    // Return display-format tokens used for each time unit.
    formats: function () {
      return {
        datetime:    'MMM d, yyyy',
        millisecond: 'h:mm:ss.SSS',
        second:      'h:mm:ss',
        minute:      'h:mm',
        hour:        'ha',
        day:         'MMM d',
        week:        'MMM d',
        month:       'MMM yy',
        quarter:     'qqq yyyy',
        year:        'yyyy',
      };
    },

    // Parse any value to a Unix timestamp (ms).
    parse: function (value) {
      if (value === null || value === undefined || value === '') return null;
      if (value instanceof Date) return isNaN(value.getTime()) ? null : value.getTime();
      if (typeof value === 'number') return value;
      var ms = new Date(value).getTime();
      return isNaN(ms) ? null : ms;
    },

    // Format a Unix timestamp (ms) using a simple format string.
    format: function (time, fmt) {
      var d = new Date(time);
      var yr  = d.getFullYear();
      var yr2 = String(yr).slice(2);
      var mo  = d.getMonth();      // 0-based
      var day = d.getDate();

      if (fmt === 'MMM yy')   return MONTHS_SHORT[mo] + ' ' + yr2;
      if (fmt === 'MMM yyyy') return MONTHS_SHORT[mo] + ' ' + yr;
      if (fmt === 'MMM d')    return MONTHS_SHORT[mo] + ' ' + day;
      if (fmt === 'yyyy')     return String(yr);
      if (fmt === 'ha') {
        var h = d.getHours();
        return (h % 12 || 12) + (h < 12 ? 'am' : 'pm');
      }
      // Fallback — locale short
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    },

    // Add an amount of a given unit to a Unix timestamp.
    add: function (time, amount, unit) {
      var d = new Date(time);
      if (unit === 'millisecond') d.setMilliseconds(d.getMilliseconds() + amount);
      else if (unit === 'second')  d.setSeconds(d.getSeconds() + amount);
      else if (unit === 'minute')  d.setMinutes(d.getMinutes() + amount);
      else if (unit === 'hour')    d.setHours(d.getHours() + amount);
      else if (unit === 'day')     d.setDate(d.getDate() + amount);
      else if (unit === 'week')    d.setDate(d.getDate() + amount * 7);
      else if (unit === 'month')   d.setMonth(d.getMonth() + amount);
      else if (unit === 'quarter') d.setMonth(d.getMonth() + amount * 3);
      else if (unit === 'year')    d.setFullYear(d.getFullYear() + amount);
      return d.getTime();
    },

    // Difference between two timestamps in the given unit.
    diff: function (a, b, unit) {
      if (MS[unit]) return (a - b) / MS[unit];
      var da = new Date(a), db = new Date(b);
      if (unit === 'month')   return (da.getFullYear() - db.getFullYear()) * 12 + (da.getMonth() - db.getMonth());
      if (unit === 'quarter') return Math.floor(((da.getFullYear() - db.getFullYear()) * 12 + (da.getMonth() - db.getMonth())) / 3);
      if (unit === 'year')    return da.getFullYear() - db.getFullYear();
      return (a - b) / MS.day;
    },

    // Return the start of a time unit as a Unix timestamp.
    startOf: function (time, unit, weekday) {
      var d = new Date(time);
      if (unit === 'second')       { d.setMilliseconds(0); }
      else if (unit === 'minute')  { d.setSeconds(0, 0); }
      else if (unit === 'hour')    { d.setMinutes(0, 0, 0); }
      else if (unit === 'day')     { d.setHours(0, 0, 0, 0); }
      else if (unit === 'week') {
        var wday = weekday || 0;
        var diff = (d.getDay() - wday + 7) % 7;
        d.setDate(d.getDate() - diff);
        d.setHours(0, 0, 0, 0);
      }
      else if (unit === 'month')   { d.setDate(1); d.setHours(0, 0, 0, 0); }
      else if (unit === 'quarter') {
        d.setMonth(Math.floor(d.getMonth() / 3) * 3, 1);
        d.setHours(0, 0, 0, 0);
      }
      else if (unit === 'year')    { d.setMonth(0, 1); d.setHours(0, 0, 0, 0); }
      return d.getTime();
    },

    // Return the end of a time unit (one ms before the start of the next).
    endOf: function (time, unit) {
      return this.add(this.startOf(time, unit), 1, unit) - 1;
    },
  });
})();
