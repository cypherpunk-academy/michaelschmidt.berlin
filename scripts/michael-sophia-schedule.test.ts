import assert from 'assert';
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { chapterWindow } from './michael-sophia';

const CHAPTERS = 28;
const SEASON_YEAR = 2026;

const publishedCount = (now: Date): number => {
    let count = 0;
    for (let i = 0; i < CHAPTERS; i++) {
        const { date, expirydate } = chapterWindow(i, now);
        if (date.getTime() <= now.getTime() && expirydate.getTime() > now.getTime()) {
            count += 1;
        }
    }
    return count;
};

for (const nowIso of [
    '2026-11-21T08:00:00+01:00',
    '2026-12-01T05:30:00+01:00',
    '2026-12-15T12:00:00+01:00',
]) {
    const dates = new Set<string>();
    for (let i = 0; i < CHAPTERS; i++) {
        const { date, expirydate } = chapterWindow(i, new Date(nowIso));
        const day = String(i + 1).padStart(2, '0');
        assert.strictEqual(
            date.toISOString(),
            `${SEASON_YEAR}-12-${day}T05:00:00.000Z`,
            `Folge ${i + 1} am ${nowIso}`
        );
        assert.strictEqual(expirydate.toISOString(), '2027-01-07T05:00:00.000Z');
        dates.add(date.toISOString());
    }
    assert.strictEqual(dates.size, CHAPTERS, 'jede Folge hat einen eigenen Tag');
}

assert.strictEqual(publishedCount(new Date('2026-11-30T22:00:00+01:00')), 0);
assert.strictEqual(publishedCount(new Date('2026-12-01T05:30:00+01:00')), 0);
assert.strictEqual(publishedCount(new Date('2026-12-01T06:30:00+01:00')), 1);
assert.strictEqual(publishedCount(new Date('2026-12-02T06:30:00+01:00')), 2);
assert.strictEqual(publishedCount(new Date('2026-12-15T12:00:00+01:00')), 15);
assert.strictEqual(publishedCount(new Date('2026-12-28T08:00:00+01:00')), 28);
assert.strictEqual(publishedCount(new Date('2027-01-06T12:00:00+01:00')), 28);
assert.strictEqual(publishedCount(new Date('2027-01-07T12:00:00+01:00')), 0);

const repo = path.resolve(__dirname, '..');
const hugo = 'hugo';

const render = (clock: string): string => {
    const destination = fs.mkdtempSync(path.join(os.tmpdir(), 'sophia-hugo-'));
    execFileSync(
        hugo,
        [
            '--source',
            repo,
            '--destination',
            destination,
            '--clock',
            clock,
            '--quiet',
        ],
        { stdio: 'inherit' }
    );
    return destination;
};

const episodesIn = (destination: string): string[] => {
    const storyDir = path.join(destination, 'de', 'story');
    if (!fs.existsSync(storyDir)) {
        return [];
    }
    return fs
        .readdirSync(storyDir)
        .filter((name) => /^sophia-\d+$/.test(name))
        .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
};

const before = episodesIn(render('2026-11-30T23:00:00+01:00'));
const firstDay = episodesIn(render('2026-12-01T06:30:00+01:00'));
const secondDestination = render('2026-12-02T06:30:00+01:00');
const secondDay = episodesIn(secondDestination);
const full = episodesIn(render('2026-12-28T08:00:00+01:00'));

assert.deepStrictEqual(before, []);
assert.deepStrictEqual(firstDay, ['sophia-1']);
assert.deepStrictEqual(secondDay, ['sophia-1', 'sophia-2']);
assert.strictEqual(full.length, CHAPTERS);
assert.strictEqual(full[0], 'sophia-1');
assert.strictEqual(full[CHAPTERS - 1], 'sophia-28');

const home = fs.readFileSync(path.join(secondDestination, 'de', 'index.html'), 'utf8');
const priority = home.split('priority-homepage')[1]?.split('</section>')[0] ?? '';
assert.ok(priority.includes('Sophia* und Josef'), 'Startseite zeigt Sophia');
assert.ok(!priority.includes('2064'), 'Startseite zeigt nicht mehr 2064 als Hauptinhalt');

const menu = home.split('dropdown-menu')[1]?.split('</div>')[0] ?? '';
const menuItems = [...menu.matchAll(/dropdown-item[^>]*>([^<]+)/g)].map((match) =>
    match[1].trim()
);
assert.deepStrictEqual(menuItems[0], 'Sophia', 'Sophia steht vorn in der Navigation');
assert.ok(menu.includes('/de/homepage/sophia/'), 'Navigation verlinkt Sophia');

const episodeOne = fs.readFileSync(
    path.join(secondDestination, 'de', 'story', 'sophia-1', 'index.html'),
    'utf8'
);
const episodeTwo = fs.readFileSync(
    path.join(secondDestination, 'de', 'story', 'sophia-2', 'index.html'),
    'utf8'
);
assert.ok(episodeOne.includes('/de/story/sophia-2/'), 'Folge 1 verlinkt Folge 2');
assert.ok(
    episodeTwo.includes('Mehr gibt es noch nicht'),
    'Folge 2 wartet auf den nächsten Tag'
);
assert.ok(!fs.existsSync(path.join(secondDestination, 'de', 'story', 'sophia-3', 'index.html')));

console.log('Folge für Folge: 0, dann 1, dann 2, am 28. Dezember alle 28.');
