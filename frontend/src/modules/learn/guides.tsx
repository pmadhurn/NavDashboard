import React from 'react';
import {
  ExportOutlined,
  ImportOutlined,
  AppstoreOutlined,
  ShoppingCartOutlined,
  SwapOutlined,
  ProjectOutlined,
  CalendarOutlined,
  WalletOutlined,
} from '@ant-design/icons';
import {
  Art,
  Screen,
  Btn,
  Row,
  Arrow,
  Tap,
  QrBox,
  DeviceBox,
  Person,
  Doc,
  Tag,
  Check,
  ScanFrame,
  Label,
  INK,
  HI,
  OK,
  WARN,
  FILL,
} from './components/art';

export interface GuideStep {
  title: string;
  /** One line, ≤ 12 words. */
  caption: string;
  art: React.ReactNode;
}

export interface Guide {
  key: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accent: string;
  /** Where "Try it now" lands. */
  tryRoute: string;
  steps: GuideStep[];
}

/**
 * The eight walkthroughs. Every illustration is composed from the primitives
 * in components/art.tsx so the whole section reads as one hand.
 */
export const GUIDES: Guide[] = [
  {
    key: 'outward',
    title: 'Take equipment out',
    subtitle: 'From the shelf to the site, with a gate pass',
    icon: <ExportOutlined />,
    accent: 'var(--secondary)',
    tryRoute: '/inventory/outward',
    steps: [
      {
        title: 'Start with the why',
        caption: 'Pick the project or purpose the equipment is leaving for.',
        art: (
          <Art>
            <Screen x={105} y={18}>
              <Label x={160} y={44} size={11} weight={600} color="var(--text-primary)">
                Where to?
              </Label>
              <Row x={115} y={56} label="Project Alpha" active />
              <Row x={115} y={80} label="Project Beta" />
              <Row x={115} y={104} label="Demo / R&D" />
            </Screen>
            <Tap x={196} y={65} />
          </Art>
        ),
      },
      {
        title: 'Say who is going',
        caption: 'Choose the people carrying it out the door.',
        art: (
          <Art>
            <Screen x={40} y={18}>
              <Label x={95} y={44} size={11} weight={600} color="var(--text-primary)">
                Who?
              </Label>
              <Row x={50} y={56} label="Asha" checked />
              <Row x={50} y={80} label="Vikram" checked />
              <Row x={50} y={104} label="Neel" />
            </Screen>
            <Arrow x1={160} y1={98} x2={210} y2={98} />
            <Person x={240} y={70} label="Asha" color={HI} />
            <Person x={285} y={70} label="Vikram" color={HI} />
          </Art>
        ),
      },
      {
        title: 'Scan the QR stickers',
        caption: 'Point the camera at each sticker to add that item.',
        art: (
          <Art>
            <DeviceBox x={30} y={70} label="Radio" />
            <QrBox x={100} y={78} size={30} />
            <ScanFrame x={90} y={68} size={50} />
            <Arrow x1={150} y1={93} x2={195} y2={93} />
            <Screen x={200} y={18}>
              <Label x={255} y={44} size={11} weight={600} color="var(--text-primary)">
                In the list
              </Label>
              <Row x={210} y={56} label="Radio #12" checked />
              <Row x={210} y={80} label="Tripod #3" checked />
            </Screen>
          </Art>
        ),
      },
      {
        title: 'Review and submit',
        caption: 'Check the list once, then send it off.',
        art: (
          <Art>
            <Screen x={105} y={18}>
              <Row x={115} y={38} label="Radio #12" checked />
              <Row x={115} y={62} label="Tripod #3" checked />
              <Row x={115} y={86} label="Cable kit" checked />
              <Btn x={120} y={130} w={80} label="Submit" tone="primary" />
            </Screen>
            <Tap x={196} y={140} />
          </Art>
        ),
      },
      {
        title: 'Gate pass at security',
        caption: 'Show the pass at the gate on your way out.',
        art: (
          <Art>
            <Doc x={70} y={45} w={48} h={62} label="Gate pass" />
            <Arrow x1={130} y1={76} x2={185} y2={76} />
            <Person x={225} y={55} label="Security" />
            <Check x={262} y={50} />
          </Art>
        ),
      },
    ],
  },
  {
    key: 'inward',
    title: 'Receive items back',
    subtitle: 'Close the loop when equipment returns',
    icon: <ImportOutlined />,
    accent: '#5E8C86',
    tryRoute: '/inventory/inward',
    steps: [
      {
        title: 'Open the gate pass',
        caption: 'Find the pass the items went out on.',
        art: (
          <Art>
            <Screen x={40} y={18}>
              <Label x={95} y={44} size={11} weight={600} color="var(--text-primary)">
                Open passes
              </Label>
              <Row x={50} y={56} label="Pass #241" active />
              <Row x={50} y={80} label="Pass #238" />
            </Screen>
            <Arrow x1={160} y1={70} x2={205} y2={70} />
            <Doc x={215} y={40} w={48} h={62} label="Pass #241" />
            <Tap x={132} y={65} />
          </Art>
        ),
      },
      {
        title: 'Scan each item back in',
        caption: 'Every sticker you scan gets ticked off the pass.',
        art: (
          <Art>
            <QrBox x={45} y={78} size={30} />
            <ScanFrame x={35} y={68} size={50} />
            <Arrow x1={95} y1={93} x2={140} y2={93} />
            <Screen x={150} y={18}>
              <Row x={160} y={50} label="Radio #12" checked />
              <Row x={160} y={74} label="Tripod #3" checked />
              <Row x={160} y={98} label="Cable kit" />
            </Screen>
          </Art>
        ),
      },
      {
        title: 'Be honest about condition',
        caption: 'Mark anything damaged or left at the site.',
        art: (
          <Art>
            <Screen x={70} y={18} w={180}>
              <Row x={82} y={45} w={100} label="Radio #12" dot="ok" />
              <Row x={82} y={72} w={100} label="Tripod #3" dot="warn" />
              <Row x={82} y={99} w={100} label="Cable kit" dot="warn" />
              <Tag x={190} y={70} label="Damaged" color={WARN} />
              <Tag x={190} y={97} label="At site" color={WARN} />
            </Screen>
            <Label x={160} y={192} size={11}>
              Honesty here saves arguments later
            </Label>
          </Art>
        ),
      },
      {
        title: 'Partial is fine',
        caption: 'Return what you have; the pass stays open for the rest.',
        art: (
          <Art>
            <Screen x={40} y={18}>
              <Row x={50} y={45} label="Radio #12" checked />
              <Row x={50} y={69} label="Tripod #3" checked />
              <Row x={50} y={93} label="Cable kit" />
            </Screen>
            <Arrow x1={160} y1={80} x2={200} y2={80} dash />
            <Doc x={210} y={40} w={48} h={62} />
            <Tag x={202} y={115} label="Still open" color={HI} />
          </Art>
        ),
      },
    ],
  },
  {
    key: 'assets',
    title: 'Add an item & print its QR',
    subtitle: 'Give every asset a sticker and an identity',
    icon: <AppstoreOutlined />,
    accent: '#7E8FA6',
    tryRoute: '/inventory/assets',
    steps: [
      {
        title: 'Add the asset',
        caption: 'One form: name it and describe it.',
        art: (
          <Art>
            <Screen x={105} y={18}>
              <Label x={160} y={44} size={11} weight={600} color="var(--text-primary)">
                Assets
              </Label>
              <Row x={115} y={56} label="Radio #12" />
              <Row x={115} y={80} label="Tripod #3" />
              <Btn x={120} y={130} w={80} label="+ Add asset" tone="primary" />
            </Screen>
            <Tap x={196} y={140} />
          </Art>
        ),
      },
      {
        title: 'Category picks the serial rule',
        caption: 'Choose a category; the serial number follows its rule automatically.',
        art: (
          <Art>
            <Screen x={40} y={18}>
              <Label x={95} y={44} size={11} weight={600} color="var(--text-primary)">
                Category
              </Label>
              <Row x={50} y={56} label="Radio" active />
              <Row x={50} y={80} label="Tripod" />
            </Screen>
            <Arrow x1={160} y1={70} x2={200} y2={70} />
            <Tag x={208} y={60} label="RAD-0013" color={HI} />
            <Label x={238} y={100} size={11}>
              Serial assigned for you
            </Label>
          </Art>
        ),
      },
      {
        title: 'Save it',
        caption: 'The asset now exists and can be tracked.',
        art: (
          <Art>
            <Screen x={105} y={18}>
              <Row x={115} y={50} label="Radio #13" active />
              <Btn x={120} y={124} w={80} label="Save" tone="ok" />
            </Screen>
            <Check x={230} y={60} r={14} />
          </Art>
        ),
      },
      {
        title: 'Print the sticker sheet',
        caption: 'Select assets, print one sheet of QR stickers.',
        art: (
          <Art>
            <Screen x={30} y={18}>
              <Row x={40} y={45} label="Radio #13" checked />
              <Row x={40} y={69} label="Radio #14" checked />
              <Btn x={45} y={124} w={80} label="Print QR" tone="primary" />
            </Screen>
            <Arrow x1={150} y1={90} x2={190} y2={90} />
            <rect x={200} y={40} width={90} height={110} rx={4} fill={FILL} stroke={INK} strokeWidth={1.5} />
            <QrBox x={210} y={50} size={30} />
            <QrBox x={250} y={50} size={30} />
            <QrBox x={210} y={90} size={30} />
            <QrBox x={250} y={90} size={30} />
          </Art>
        ),
      },
      {
        title: 'Stick it on',
        caption: 'One sticker per item, somewhere scannable.',
        art: (
          <Art>
            <QrBox x={70} y={60} size={34} />
            <Arrow x1={115} y1={77} x2={165} y2={77} />
            <DeviceBox x={175} y={55} w={80} h={54} label="Radio #13" />
            <QrBox x={228} y={85} size={20} />
            <Check x={280} y={60} />
          </Art>
        ),
      },
    ],
  },
  {
    key: 'requests',
    title: 'Ask for something to be bought',
    subtitle: 'Required items, from ask to received',
    icon: <ShoppingCartOutlined />,
    accent: '#B68A3C',
    tryRoute: '/inventory/requests',
    steps: [
      {
        title: 'Open Required Items',
        caption: 'One shared list of everything the team needs.',
        art: (
          <Art>
            <Screen x={105} y={18}>
              <Label x={160} y={44} size={11} weight={600} color="var(--text-primary)">
                Required items
              </Label>
              <Row x={115} y={56} label="SIM cards" dot="ok" />
              <Row x={115} y={80} label="Batteries" dot="warn" />
              <Row x={115} y={104} label="Zip ties" />
            </Screen>
          </Art>
        ),
      },
      {
        title: 'Ask for what you need',
        caption: 'Add the item, quantity, and why.',
        art: (
          <Art>
            <Screen x={105} y={18}>
              <Row x={115} y={50} label="Antenna x4" active />
              <Btn x={120} y={124} w={80} label="Request" tone="primary" />
            </Screen>
            <Tap x={196} y={134} />
          </Art>
        ),
      },
      {
        title: 'Watch it move',
        caption: 'Approved, then ordered, then received — status updates itself.',
        art: (
          <Art>
            <Tag x={30} y={85} label="Approved" color={HI} />
            <Arrow x1={102} y1={94} x2={125} y2={94} />
            <Tag x={130} y={85} label="Ordered" color={HI} />
            <Arrow x1={198} y1={94} x2={221} y2={94} />
            <Tag x={226} y={85} label="Received" color={OK} />
          </Art>
        ),
      },
      {
        title: 'Everyone sees the same list',
        caption: 'You, the boss, and finance all look at one list.',
        art: (
          <Art>
            <Person x={60} y={40} label="You" />
            <Person x={160} y={30} label="Boss" />
            <Person x={260} y={40} label="Finance" />
            <Arrow x1={75} y1={90} x2={130} y2={125} dash />
            <Arrow x1={160} y1={80} x2={160} y2={118} dash />
            <Arrow x1={245} y1={90} x2={190} y2={125} dash />
            <Doc x={136} y={128} w={48} h={58} />
          </Art>
        ),
      },
    ],
  },
  {
    key: 'handovers',
    title: 'Hand over to a teammate',
    subtitle: 'Move custody, not just the box',
    icon: <SwapOutlined />,
    accent: '#9E7E8A',
    tryRoute: '/inventory/handovers',
    steps: [
      {
        title: 'Pick the items',
        caption: 'Select what you are handing over.',
        art: (
          <Art>
            <Screen x={105} y={18}>
              <Label x={160} y={44} size={11} weight={600} color="var(--text-primary)">
                My items
              </Label>
              <Row x={115} y={56} label="Radio #12" checked />
              <Row x={115} y={80} label="Tripod #3" checked />
              <Row x={115} y={104} label="Cable kit" />
            </Screen>
          </Art>
        ),
      },
      {
        title: 'Pick the person',
        caption: 'Choose who is taking them.',
        art: (
          <Art>
            <Person x={70} y={60} label="Neel" />
            <Person x={160} y={60} label="Asha" color={HI} />
            <Person x={250} y={60} label="Vikram" />
            <Tap x={160} y={112} />
          </Art>
        ),
      },
      {
        title: 'They accept — on their phone',
        caption: 'Nothing moves until your teammate taps Accept themselves.',
        art: (
          <Art>
            <Person x={55} y={50} label="You" />
            <Arrow x1={80} y1={90} x2={125} y2={90} dash />
            <Screen x={135} y={18}>
              <Label x={190} y={48} size={10}>
                From: You
              </Label>
              <Row x={145} y={58} label="Radio #12" />
              <Btn x={150} y={120} w={80} label="Accept" tone="ok" />
            </Screen>
            <Tap x={226} y={130} />
            <Person x={285} y={50} label="Asha" color={HI} />
          </Art>
        ),
      },
      {
        title: 'Custody moves',
        caption: 'The items are now on their record, not yours.',
        art: (
          <Art>
            <DeviceBox x={40} y={65} label="Radio" />
            <Arrow x1={110} y1={87} x2={185} y2={87} color={OK} />
            <Person x={225} y={60} label="Asha" color={OK} />
            <Check x={270} y={55} />
          </Art>
        ),
      },
    ],
  },
  {
    key: 'projects',
    title: 'Run a project',
    subtitle: 'Team, phases, equipment, and the map',
    icon: <ProjectOutlined />,
    accent: 'var(--status-not-working)',
    tryRoute: '/projects',
    steps: [
      {
        title: 'Create it, pick the team',
        caption: 'Everyone you add is notified immediately.',
        art: (
          <Art>
            <Screen x={40} y={18}>
              <Label x={95} y={44} size={11} weight={600} color="var(--text-primary)">
                New project
              </Label>
              <Row x={50} y={56} label="Asha" checked />
              <Row x={50} y={80} label="Vikram" checked />
            </Screen>
            <Arrow x1={160} y1={70} x2={205} y2={70} />
            <Person x={235} y={45} label="Asha" color={HI} />
            <Person x={285} y={45} label="Vikram" color={HI} />
            <Tag x={228} y={105} label="Notified" color={HI} />
          </Art>
        ),
      },
      {
        title: 'Break it into phases',
        caption: 'Survey, install, deploy — track each one.',
        art: (
          <Art>
            <Screen x={70} y={18} w={180}>
              <Row x={82} y={48} w={120} label="Survey" checked />
              <Row x={82} y={75} w={120} label="Install" active />
              <Row x={82} y={102} w={120} label="Deploy" />
              <Tag x={208} y={73} label="Now" color={HI} />
            </Screen>
          </Art>
        ),
      },
      {
        title: 'Draw equipment against it',
        caption: 'Outward passes link to the project, so nothing goes missing.',
        art: (
          <Art>
            <DeviceBox x={35} y={60} label="Radio" />
            <Arrow x1={105} y1={82} x2={150} y2={82} />
            <Doc x={158} y={50} w={44} h={58} label="Gate pass" />
            <Arrow x1={210} y1={79} x2={250} y2={79} dash />
            <Tag x={252} y={70} label="Alpha" color={HI} />
          </Art>
        ),
      },
      {
        title: 'Keep documents attached',
        caption: 'Surveys, approvals, photos — all on the project page.',
        art: (
          <Art>
            <Doc x={70} y={50} w={42} h={54} label="Survey" />
            <Doc x={140} y={50} w={42} h={54} label="Approval" />
            <Doc x={210} y={50} w={42} h={54} label="Photos" />
          </Art>
        ),
      },
      {
        title: 'See it live on the map',
        caption: 'Deployed Links appear on the map as they come up.',
        art: (
          <Art>
            <rect x={60} y={30} width={200} height={130} rx={10} fill={FILL} stroke={INK} strokeWidth={1.5} />
            <path d="M 60 95 Q 130 70 190 100 T 260 90" fill="none" stroke={INK} strokeWidth={1} opacity={0.4} />
            <circle cx={110} cy={70} r={6} fill={OK} />
            <circle cx={200} cy={110} r={6} fill={OK} />
            <line x1={110} y1={70} x2={200} y2={110} stroke={OK} strokeWidth={1.6} strokeDasharray="4 4" />
            <Tag x={128} y={125} label="Link up" color={OK} />
          </Art>
        ),
      },
    ],
  },
  {
    key: 'attendance',
    title: 'Log your day',
    subtitle: 'Day types, and how comp-off is earned',
    icon: <CalendarOutlined />,
    accent: '#6F8CB6',
    tryRoute: '/me/attendance',
    steps: [
      {
        title: 'Open My Attendance',
        caption: 'Your month, one row per day.',
        art: (
          <Art>
            <Screen x={105} y={18}>
              <Label x={160} y={44} size={11} weight={600} color="var(--text-primary)">
                August
              </Label>
              <Row x={115} y={56} label="Mon 11" dot="ok" />
              <Row x={115} y={80} label="Tue 12" dot="ok" />
              <Row x={115} y={104} label="Wed 13" active />
            </Screen>
          </Art>
        ),
      },
      {
        title: 'Pick the day type',
        caption: 'Office, field, or leave — one tap each day.',
        art: (
          <Art>
            <Screen x={105} y={18}>
              <Label x={160} y={44} size={11} weight={600} color="var(--text-primary)">
                Wed 13
              </Label>
              <Row x={115} y={56} label="Office" />
              <Row x={115} y={80} label="Field" active />
              <Row x={115} y={104} label="Leave" />
            </Screen>
            <Tap x={196} y={89} />
          </Art>
        ),
      },
      {
        title: 'Weekends in the field pay back',
        caption: 'A field day on a weekend earns a comp-off.',
        art: (
          <Art>
            <Screen x={70} y={18} w={180}>
              <Row x={82} y={48} w={100} label="Fri 15" dot="ok" />
              <Row x={82} y={75} w={100} label="Sat 16" active />
              <Row x={82} y={102} w={100} label="Sun 17" />
              <Tag x={190} y={73} label="+1 comp-off" color={OK} />
            </Screen>
          </Art>
        ),
      },
      {
        title: 'Spend it later',
        caption: 'Your comp-off balance is a day off in the bank.',
        art: (
          <Art>
            <Tag x={100} y={60} label="Comp-off: 2" color={OK} />
            <Arrow x1={160} y1={90} x2={160} y2={120} />
            <Row x={110} y={128} w={100} label="Day off" checked />
          </Art>
        ),
      },
    ],
  },
  {
    key: 'finance',
    title: 'Money on the road',
    subtitle: 'Expenses, receipts, advances, settlement',
    icon: <WalletOutlined />,
    accent: 'var(--status-working)',
    tryRoute: '/finance/my',
    steps: [
      {
        title: 'Expense in two taps',
        caption: 'Amount and what it was for. Done.',
        art: (
          <Art>
            <Screen x={105} y={18}>
              <Label x={160} y={48} size={12} weight={600} color="var(--text-primary)">
                ₹ 450
              </Label>
              <Row x={115} y={58} label="Fuel" active />
              <Btn x={120} y={124} w={80} label="Add" tone="primary" />
            </Screen>
            <Tap x={196} y={134} />
          </Art>
        ),
      },
      {
        title: 'Camera the receipt',
        caption: 'Snap it now; paper gets lost, photos do not.',
        art: (
          <Art>
            <Doc x={75} y={55} w={42} h={54} label="Receipt" />
            <ScanFrame x={65} y={45} size={64} />
            <Arrow x1={150} y1={80} x2={195} y2={80} />
            <Screen x={200} y={18}>
              <Row x={210} y={50} label="Fuel ₹450" checked />
            </Screen>
          </Art>
        ),
      },
      {
        title: 'Watch your advance',
        caption: 'Every expense draws down the advance you carry.',
        art: (
          <Art>
            <Tag x={55} y={60} label="Advance ₹5,000" color={HI} />
            <Arrow x1={170} y1={69} x2={200} y2={69} />
            <Tag x={205} y={60} label="₹4,550 left" color={OK} />
            <Row x={110} y={110} w={100} label="Fuel ₹450" checked />
          </Art>
        ),
      },
      {
        title: 'Finance settles up',
        caption: 'At month end the office closes the balance with you.',
        art: (
          <Art>
            <Person x={70} y={55} label="You" />
            <Arrow x1={95} y1={95} x2={150} y2={95} dash />
            <Doc x={158} y={60} w={42} h={54} />
            <Arrow x1={208} y1={95} x2={250} y2={95} dash />
            <Person x={275} y={55} label="Finance" color={OK} />
            <Tag x={130} y={150} label="Settled" color={OK} />
          </Art>
        ),
      },
    ],
  },
];
