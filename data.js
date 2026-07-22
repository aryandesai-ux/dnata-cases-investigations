/* =============================================================================
   dnata "Today" — demo dataset
   A faithful port of the curated cases from the ZenduONE "Today" design.
   The queue, digests and streak are curated demo content; the logged-in user's
   name and a live device/exception count are layered on at runtime from the
   Geotab API when the add-in runs inside MyGeotab (see app.js -> loadLiveContext).
   ========================================================================== */
(function () {
  'use strict';

  // ── Category metadata (label, icon key, accent tint for the chip icon) ────
  var CATEGORIES = {
    'Collisions':  { icon: 'alert-triangle', accent: '#D92D20' }
  };

  // Order of the category tabs (counts are derived at render time)
  var CATEGORY_ORDER = ['Collisions'];

  // ── Assignable fleet-manager team ─────────────────────────────────────────
  var USERS = [
    { id: 'me',   name: 'Olivia Rhye (me)', initials: 'OR', me: true },
    { id: 'sam',  name: 'Sam Torres',       initials: 'ST' },
    { id: 'priya',name: 'Priya Nair',       initials: 'PN' },
    { id: 'alex', name: 'Alex Boyd',        initials: 'AB' },
    { id: 'webb', name: 'Marcus Webb',      initials: 'MW' },
    { id: 'elena',name: 'Elena Rodriguez',  initials: 'ER' }
  ];

  var STATUSES = ['Open', 'In review', 'Resolved'];

  // Default insurer for First Notice of Loss — every case can raise an FNOL
  var INSURER = {
    name: 'Northbridge Commercial', policy: 'NB-884210-F',
    destination: 'fnol@northbridge-commercial.example',
    webhook: 'https://api.northbridge.example/fnol'
  };

  // Configured internal FNOL recipient directory (prototype fixture — a real
  // deployment reads these from company settings / the Geotab user directory).
  var FNOL_INTERNAL = [
    { label: 'Supervisor', addr: 'supervisor@northwind-logistics.example' },
    { label: 'Fleet manager', addr: 'fleet.ops@northwind-logistics.example' },
    { label: 'Safety team', addr: 'safety@northwind-logistics.example' },
    { label: 'Claims admin', addr: 'claims.admin@northwind-logistics.example' }
  ];

  // ── Accident-case pipeline (configurable statuses, sentence case) ─────────
  var ACCIDENT_STATUSES = [
    'Potential accident', 'Driver contact required', 'Under review',
    'Confirmed accident', 'Evidence collection', 'FNOL required',
    'FNOL submitted', 'Awaiting insurer response', 'Closed'
  ];

  // ── AI "Clarity" digest ───────────────────────────────────────────────────
  // References only the two seeded cases in the queue.
  var DIGESTS = [
    { tag: 'Case digest', text: 'Two collision cases are open for review: the TOR10421 rear-end crash with dual-channel video evidence, and the reported low-speed contact involving TTR 4273 and TTR 5291 at DXB, which remains under investigation.' }
  ];

  // No streak fixture: the streak chip and popover are hidden when null.
  var STREAK = null;

  // ── The case queue ─────────────────────────────────────────────────────────
  var CASES = [
    {
      id: 'c12', code: 'CS-20260707-10421', title: 'Harsh braking and rear-end crash - Unit TOR10421',
      category: 'Collisions', severity: 'Medium', time: 'Jul 7', sort: 2,
      // Pinned for the demo walkthrough: TOR10421 leads the queue.
      pinned: true,
      assignee: 'me', due: 'Due this week', status: 'In review', sla: '4 d left',
      primaryAction: 'Contact driver',
      subject: { initials: 'TO', name: 'Unit TOR10421' },
      metricStrong: 'Rear-end contact on video',
      metricRest: '· approx. 24 mph near impact · est. peak decel -0.41 g (derived, not accelerometer data) · Jul 7, 12:44 PM GMT-05:00',
      whatHappened: {
        entity: 'Unit TOR10421',
        text: ' was travelling at approximately 25 to 26 mph behind a black sedan on a dry multi-lane commercial roadway. A white SUV entered the active roadway from a right-side access and the black sedan ahead slowed sharply. The following gap collapsed and TOR10421 made rear-end contact with the black sedan at approximately 12:44:31 PM GMT-05:00. The impact displaced the driver and unsecured cab items. The vehicles separated and stabilized at approximately 5 mph.'
      },
      evidence: [
        {
          kind: 'video', src: 'media/tor10421/tor10421-all-channels.mp4',
          poster: 'media/tor10421/frames/EV-F01.jpg',
          durationSeconds: 11, duration: '0:11',
          label: 'Original dual-channel event video', provenance: 'recorded',
          place: 'Eglinton Ave W and Satellite Dr area', time: 'Jul 7 · 12:44 PM',
          // Frame-evidence timeline: extracted stills pinned to clip timestamps.
          // Descriptions are the package evidence index observations, verbatim.
          frameEvidence: [
            { id: 'EV-F01', src: 'media/tor10421/frames/EV-F01.jpg', timeSeconds: 0.0, label: 'Normal approach', crashSequence: false,
              description: 'TOR10421 is moving with normal traffic flow on a dry commercial roadway. The driver is forward-facing and the lane ahead is open.' },
            { id: 'EV-F02', src: 'media/tor10421/frames/EV-F02.jpg', timeSeconds: 5.0, label: 'White SUV at access', crashSequence: false,
              description: 'The white SUV is positioned at or near the commercial access on the right. The black sedan remains directly ahead of TOR10421.' },
            { id: 'EV-F03', src: 'media/tor10421/frames/EV-F03.jpg', timeSeconds: 6.0, label: 'SUV enters roadway', crashSequence: false,
              description: 'The white SUV moves from the right-side access into the active traffic area. The black sedan ahead begins responding to the entry.' },
            { id: 'EV-F04', src: 'media/tor10421/frames/EV-F04.jpg', timeSeconds: 7.0, label: 'Lead sedan slows sharply', crashSequence: false,
              description: 'The black sedan directly ahead slows sharply while the white SUV occupies the roadway to its right.' },
            { id: 'EV-F05', src: 'media/tor10421/frames/EV-F05.jpg', timeSeconds: 7.4, label: 'Gap collapses', crashSequence: true,
              description: 'The rear of the black sedan rapidly fills the forward camera view. The remaining separation is extremely limited.' },
            { id: 'EV-F06', src: 'media/tor10421/frames/EV-F06.jpg', timeSeconds: 7.6, label: 'Rear-end contact', crashSequence: true,
              description: 'TOR10421 reaches the rear of the black sedan. The sedan occupies the lower forward-camera field with no meaningful visible separation.' },
            { id: 'EV-F07', src: 'media/tor10421/frames/EV-F07.jpg', timeSeconds: 7.7, label: 'Impact jolt', crashSequence: true,
              description: 'The forward image shows the immediate impact/jolt sequence. Debris or loose material moves across the windshield view, while papers and other unsecured cab items move sharply forward. The driver is physically displaced by the event but continues holding the steering wheel.' },
            { id: 'EV-F08', src: 'media/tor10421/frames/EV-F08.jpg', timeSeconds: 7.9, label: 'Immediate post-impact', crashSequence: true,
              description: 'TOR10421 and the black sedan remain aligned immediately after impact. Material remains visible across the forward view and the white SUV continues alongside the crash area.' },
            { id: 'EV-F09', src: 'media/tor10421/frames/EV-F09.jpg', timeSeconds: 8.3, label: 'Cab-item displacement', crashSequence: false,
              description: 'Loose papers and cab items are displaced from their pre-event positions. The driver turns and checks the surrounding area while retaining vehicle control.' },
            { id: 'EV-F10', src: 'media/tor10421/frames/EV-F10.jpg', timeSeconds: 10.0, label: 'Vehicles stabilize', crashSequence: false,
              description: 'TOR10421 and the black sedan have separated and stabilized at low speed. The white SUV remains visible to the right.' }
          ]
        },
        {
          kind: 'image', src: 'media/tor10421/tor10421-inferred-event-path.png',
          label: 'Inferred event path', provenance: 'illustrative', time: 'Jul 7',
          caption: 'Illustrative event path. Requires confirmation against GPS or telematics records.'
        },
        {
          kind: 'image', src: 'media/tor10421/tor10421-possible-contact-location.png',
          label: 'Possible contact location', provenance: 'derived', time: 'Jul 7',
          caption: 'Evidence-supported estimate of the likely contact area.'
        },
        {
          kind: 'image', src: 'media/tor10421/tor10421-risk-assessment-visual.png',
          label: 'Risk assessment visual', provenance: 'Supporting review visual', time: 'Jul 7',
          caption: 'Supporting review visual prepared from the case evidence. Not raw evidence.'
        }
      ],
      evidenceMeta: {
        cameras: ['In-cab cam'],
        // no overlay chip: the footage carries its own burned-in speed overlay
        ai: [],
        driverState: [
          ['At impact', 'Displaced by the event, kept hands on the wheel'],
          ['Post-impact', 'Checked surroundings, retained vehicle control'],
          ['Cab condition', 'Unsecured papers and items displaced']
        ],
        tripData: [], safetyHistory: [],
        telemetry: {
          // 12 samples at 1 s over the 11.0 s clip. Recorded points from the
          // camera overlay: 26 mph (+5 s), 25 (+6 s), 24 (+7 s), 5 (+10 s);
          // 15 mph is the documented deceleration-phase speed; remaining
          // samples are linear interpolations between documented points.
          speed: [26, 26, 26, 26, 26, 26, 25, 24, 15, 10, 5, 5],
          // Derived per-second longitudinal deceleration magnitudes from the
          // speed series above. Not raw accelerometer data.
          g: [0, 0, 0, 0, 0, 0, 0.05, 0.05, 0.41, 0.23, 0.23, 0],
          eventIndex: 8,
          secondsPerSample: 1,
          windowLabel: 'event clip, 0 to 11 s',
          stats: [
            ['24 mph', 'Near impact (recorded)'],
            ['-0.41 g', 'Est. peak decel (derived)'],
            ['12:44:31 PM', 'Impact time (approx.)']
          ]
        }
      },
      context: [
        'Event source: ZenduCam harsh-braking event, forward road and in-cab channels',
        'Road environment: multi-lane commercial arterial near access driveways and an intersection. Daylight, dry pavement, clear visibility',
        'Location: Eglinton Ave W and Satellite Dr area',
        'Speeds (camera overlay, recorded): approach approx. 25 to 26 mph, near impact approx. 24 mph, during deceleration approx. 15 mph, post-event approx. 5 mph',
        'G-force: est. average longitudinal deceleration approx. -0.29 g, est. peak one-second deceleration approx. -0.41 g. Derived estimate, not raw accelerometer data',
        'Contributing factors: sudden roadway entry by the white SUV, sharp lead-vehicle deceleration, insufficient following distance for the closing speed, unsecured cab materials',
        'Possible contact area: front-center to right-front of TOR10421, rear of the black sedan. Damage severity not determinable from the video alone',
        'Preliminary assessment: review as a rear-end collision with a harsh-braking trigger. Final preventability requires vehicle condition, driver statement, location data and third-party evidence',
        'Evidence integrity: video SHA-256 6F3483B8C64C7942E70FBC30DB39C70BD35C5ABC87484DC2D6CB47707C58C33F. Frames EV-F01 to EV-F10 extracted from the supplied video',
        'File-name time note: the MP4 filename indicates 13:44 while the visible camera overlay indicates approximately 12:44 GMT-05:00. System-time alignment requires confirmation',
        'No driver statement yet - welfare call pending'
      ],
      prompts: [
        'Show the frame-by-frame crash sequence',
        'How were the g-force estimates derived?',
        'What must be confirmed before FNOL?',
        'Was the following distance sufficient?'
      ],
      recommended: {
        text: 'Contact the driver to confirm welfare and obtain a statement. Then obtain exterior damage photos, preserve the original video, verify the camera clock against GPS or telematics time, retrieve raw speed and accelerometer data if available, obtain third-party contact information, inspect the front bumper, grille, hood, lamps, sensors and mounting points, review following-distance and hazard-recognition coaching, require loose cab items to be secured, and confirm whether injury, police, insurance or roadside-assistance reports exist.',
        primary: 'Contact driver',
        others: [{ title: 'Flag for review' }]
      },
      activity: [
        { text: 'Review limitations noted: no raw accelerometer data, no confirmed injury, damage, police or insurance record, preventability undetermined', meta: 'Jul 7 · Clarity AI', kind: 'ai' },
        { text: 'Speed and g-force analysis attached. Values derived from the camera overlay and frame timing, not raw accelerometer data', meta: 'Jul 7 · Clarity AI', kind: 'ai' },
        { text: 'Frame evidence index prepared: EV-F01 to EV-F10 extracted from the 11 second clip', meta: 'Jul 7 · Clarity AI', kind: 'ai' },
        { text: 'Case created from a ZenduCam harsh-braking event. Rear-end contact supported by video', meta: 'Jul 7 · Clarity AI', kind: 'ai' }
      ],
      // ── Collision analysis: honest inputs only. No Major Collision telematics
      // event was recorded; the vehicle never stopped (stabilized at ~5 mph) so
      // no stop fields are present; unknown inputs stay absent, never zeroed.
      collisionAnalysis: {
        majorCollisionDetected: false,
        eventSource: 'ZenduCam harsh-braking event',
        speedBeforeKph: 39,
        speedAfterKph: 8,
        speedChangeDurationSeconds: 2.4,
        insideSensitiveZone: false,
        // The engine score measures only the original telemetry trigger. The
        // reviewed video supports contact, so this case presents the score as
        // detection confidence and states the review outcome separately. The
        // calculation and its breakdown are unchanged.
        scorePresentation: {
          scoreLabel: 'Automated detection confidence',
          interpretation: 'Weak telemetry-only collision signature',
          assessments: [
            ['Evidence assessment', 'Rear-end contact supported by video'],
            ['Investigation status', 'In review'],
            ['Final preventability, damage, injury and liability', 'Requires confirmation']
          ],
          note: 'The automated score reflects the strength of the original telemetry trigger only. Subsequent video review supports physical contact, so the case remains under investigation.'
        },
        observedSignals: [
          { text: 'Rear-end contact supported by dual-channel video', source: 'recorded' },
          { text: 'Sharp lead-vehicle slowdown after a white SUV entered from the right-side access', source: 'recorded' },
          { text: 'Following gap collapsed immediately before contact', source: 'recorded' },
          { text: 'Driver and unsecured cab items displaced during the impact', source: 'recorded' }
        ],
        limitations: [
          { text: 'No raw accelerometer data. G-force values are derived estimates' },
          { text: 'No confirmed injury information' },
          { text: 'No confirmed physical damage severity' },
          { text: 'No confirmed police or insurance record' },
          { text: 'No final preventability determination' }
        ]
      },
      collisionAnalysisSources: {
        majorCollisionDetected: 'recorded',
        speedBeforeKph: 'derived',
        speedAfterKph: 'derived',
        speedChangeDurationSeconds: 'derived',
        insideSensitiveZone: 'derived'
      },
      // No peerComparison block: the package contains no peer data, so the
      // section stays hidden rather than showing illustrative values.
      accident: {
        status: 'Driver contact required',
        driver: { name: 'Driver identity not confirmed', id: 'Not provided', initials: '?', phone: 'Not provided' },
        vehicle: 'Unit TOR10421',
        detectedSeverity: 'Medium workflow priority. Rear-end contact supported by video. Physical damage severity not confirmed',
        location: 'Eglinton Ave W and Satellite Dr area',
        when: 'Jul 7 · 12:44 PM',
        // no cameraAudio flag: the supplied MP4 carries a single video track
        // only (no audio track confirmed in the container)
        videoAvailable: '1 dual-channel clip (11 s, video only) plus 10 review frames',
        keyQuestions: [
          'Is the driver safe, and is anyone injured?',
          'Are emergency services required?',
          'Is the vehicle drivable, and where is it now?',
          'Was a third party involved? Exchange contact and insurance details.',
          'What happened, in the driver\'s own words?',
          'Were loose items secured in the cab?'
        ],
        // No callOutcome: nothing is preselected or scripted. Third-party
        // involvement, statement and photos are captured by the manager on
        // the call; the neutral call result applies.
        telematics: {
          // Same derived series as the drawer telemetry: recorded overlay
          // speeds at +5/+6/+7/+10 s, documented 15 mph deceleration phase,
          // linear interpolation elsewhere; per-second deceleration derived
          // from the speed change. Not raw accelerometer data.
          speed: [26, 26, 26, 26, 26, 26, 25, 24, 15, 10, 5, 5],
          accel: [0, 0, 0, 0, 0, 0, 0.05, 0.05, 0.41, 0.23, 0.23, 0],
          impactIndex: 8,
          secondsPerSample: 1,
          windowLabel: 'event clip, 0 to 11 s',
          accelLabel: 'Longitudinal deceleration (derived)',
          accelUnit: 'g',
          markers: [
            { i: 5, label: 'White SUV at access (+5 s)' },
            { i: 6, label: 'SUV enters roadway (+6 s)' },
            { i: 7, label: 'Lead sedan slows (+7 s)' },
            { i: 10, label: 'Stabilized approx. 5 mph (+10 s)' }
          ],
          caption: 'Speed from the camera overlay and frame timestamps (recorded). Deceleration derived from displayed speed change per second. Derived estimate, not raw accelerometer data. Impact marker at +8 s approximates the +7.6 s contact.'
        },
        details: {
          injuries: 'Unknown. Requires confirmation on the welfare call',
          thirdParty: 'Black sedan rear-ended per video. White SUV initiating hazard. Contact details require confirmation',
          police: 'Unknown. Requires confirmation',
          towing: 'Unknown. Vehicles stabilized at low speed after the event',
          vehicleCondition: 'Damage not determinable from video. Requires inspection and confirmation of the front bumper, grille, hood, lamps, sensors and mounting points'
        },
        insurer: {
          name: 'Requires confirmation', policy: 'Requires confirmation',
          destination: '', webhook: ''
        },
        photos: [],
        welfareCall: null
      }
    },
    /* ── TTR 4273 / TTR 5291 demo case (INC-DXB-2026-0706-014) ─────────────
       Authoritative source: TTR_4273_Implementation_Only_Package. A REPORTED
       low-speed contact: telemetry never confirms contact or an impact time.
       No telemetry arrays are authored (no event-window acceleration data
       exists and interpolation is forbidden); the 7 verified records render
       as text. Evidence is demo reconstruction media, not camera footage.
       No em dashes anywhere in this case's content. ─────────────────────── */
    {
      id: 'c14', code: 'INC-DXB-2026-0706-014',
      title: 'Reported low-speed contact involving TTR 4273 and TTR 5291',
      category: 'Collisions', severity: 'Medium', time: 'Jul 6', sort: 2.5,
      // Pinned for the demo walkthrough: second in the queue, after TOR10421.
      pinned: true,
      assignee: 'me', due: 'Due this week', status: 'In review', sla: '4 d left',
      primaryAction: 'Contact driver',
      subject: { initials: 'TT', name: 'TTR 4273 & TTR 5291' },
      metricStrong: 'Reported low-speed contact',
      metricRest: '· approximately 06:35, July 6, 2026 (Asia/Dubai) · DXB airside cargo and apron vicinity · TTR 4273 recorded stationary, TTR 5291 moving nearby. Physical contact reported, not independently confirmed. Demo data.',
      whatHappened: {
        entity: 'TTR 4273 and TTR 5291',
        text: ' are the subject of a reported low-speed contact in the DXB airside cargo and apron vicinity at approximately 06:35 on July 6, 2026 (Asia/Dubai). The internal demo telemetry shows TTR 4273 stationary during the reported event window and TTR 5291 moving through the same general area at recorded speeds between 2 and 14 km/h. Telemetry does not independently prove physical contact or establish an exact impact time. Damage, injury status, contact geometry, cause, preventability and liability remain unverified. This is a simulated demonstration case.'
      },
      evidence: [
        {
          kind: 'image', src: 'media/ttr4273/ttr4273-satellite-reconstruction.png',
          label: 'Demo satellite reconstruction', provenance: 'derived', time: 'Jul 6',
          caption: 'Demo satellite reconstruction showing the two asset paths and the reported contact area. The 06:35:22 marker represents the closest relevant recorded pass, not a confirmed impact time. The reconstruction does not independently prove physical contact.'
        },
        {
          // Browser-compatible H.264 derivative of the supplied MPEG-4 Part 2
          // original (which is preserved unchanged alongside it) — same frames,
          // resolution, frame rate and duration; video-only, fast-start.
          kind: 'video', src: 'media/ttr4273/ttr4273-reconstruction-playback-h264.mp4',
          durationSeconds: 8, duration: '0:08',
          label: 'Demo reconstruction playback', provenance: 'derived', time: 'Jul 6',
          attachmentLabel: 'Demo reconstruction playback (0:08), not camera footage',
          caption: 'Simulated reconstruction based on the demo movement and location scenario. It illustrates the reported sequence but does not independently establish physical contact, exact impact time, contact geometry, cause or liability.'
        }
      ],
      // No poster on the playback item: the neutral dark tile applies, and no
      // frame is extracted from the MP4. No frameEvidence and no telemetry
      // arrays anywhere on this case.
      evidenceMeta: {
        cameras: [],
        drawerBadge: 'demo reconstruction media',
        ai: [], driverState: [], tripData: [], safetyHistory: [],
        telemetry: null
      },
      context: [
        'Demo data: this is a simulated demonstration case. Nothing in it is an operational, safety, insurance, employment or legal record',
        'Case status: Investigating (workflow) · severity pending injury and damage confirmation (workflow) · priority review required (workflow)',
        'Incident type: reported low-speed vehicle contact. Physical contact is reported, not independently confirmed (Reported)',
        'Reported event window: approximately 06:35, July 6, 2026, Asia/Dubai (UTC+4). Review window: 06:20 to 06:50 (Workflow)',
        'Location: DXB airside cargo and apron vicinity. Likely operating surface: airside service road or apron pavement (demo scenario setting)',
        'No runway involvement indicated. No aircraft involvement reported (Reported, not independently verified)',
        'Assets involved: TTR 4273 (recorded stationary through the event window) and TTR 5291 (recorded moving through the area) (Verified demo telemetry)',
        'Asset findings, TTR 4273: recorded speed 0 km/h during the 06:35 window. Approximately 7.7 metres of GPS drift visible while speed remains 0 km/h. Reported contact area rear-left side (Not verified). Damage status not verified',
        'Asset findings, TTR 5291: recorded speed increased from 2 km/h at 06:34:54 to 14 km/h at 06:35:37. Exact speed at contact not established because telemetry does not identify contact. An immediate post-event stop is not supported by the recorded speeds. Reported contact area front-right side (Not verified). Damage status not verified',
        'Telemetry timeline 1 of 7: 06:34:42.063 · TTR 5291 · trip start and GPS fix · 0 km/h · 25.2576504, 55.3421822 · initial recorded position (Verified demo telemetry)',
        'Telemetry timeline 2 of 7: 06:34:54.000 · TTR 5291 · GPS fix · 2 km/h · 25.2576256, 55.3422089 · low-speed movement (Verified demo telemetry)',
        'Telemetry timeline 3 of 7: 06:35:12.000 · TTR 5291 · GPS fix · 5 km/h · 25.2577286, 55.3423119 · continued movement (Verified demo telemetry)',
        'Telemetry timeline 4 of 7: 06:35:22.000 · TTR 5291 · GPS fix · 10 km/h · 25.2575741, 55.3424110 · closest relevant recorded pass, not a confirmed impact time (Verified demo telemetry)',
        'Telemetry timeline 5 of 7: 06:35:36.063 · TTR 4273 · GPS fix · 0 km/h · 25.2574978, 55.3423347 · stationary reference position (Verified demo telemetry)',
        'Telemetry timeline 6 of 7: 06:35:37.000 · TTR 4273 · GPS fix · 0 km/h · 25.2574978, 55.3422585 · stationary with GPS position drift (Verified demo telemetry)',
        'Telemetry timeline 7 of 7: 06:35:37.000 · TTR 5291 · GPS fix · 14 km/h · 25.2573433, 55.3428230 · continued movement away from the area (Verified demo telemetry)',
        'Proximity analysis: comparing TTR 5291 at 06:35:22 with the TTR 4273 stationary reference position gives an approximate GPS separation of 11.4 metres (Derived, limited GPS proximity estimate). This is not a measured clearance between the vehicle bodies',
        'Proximity limitations: the positions were not recorded simultaneously · GPS accuracy is unavailable · GPS antenna placement is unavailable · vehicle dimensions are unavailable · TTR 4273 shows approximately 7.7 metres of stationary GPS drift · the estimate cannot establish physical clearance or confirm contact',
        'G-force and acceleration review: event-window acceleration data unavailable. No verified acceleration or g-force records exist for either asset between 06:34 and 06:36. Synthetic values and records outside the reported event window are excluded from this case',
        'Operational context not verified: weather, lighting, lane restriction, available clearance and spotter use. Equipment or device fault: not established. GPS drift does not by itself prove a device fault',
        'Preliminary findings: telemetry supports a movement and proximity review of stationary TTR 4273 and moving TTR 5291 · telemetry does not independently establish physical contact · the closest relevant recorded pass is approximately 06:35:22 · TTR 5291 did not record an immediate stop · no verified event-window acceleration data is available · no active runway involvement is indicated · contact geometry, damage, injury status, cause, preventability and liability remain undetermined',
        'Final conclusion (demo case): the demo telemetry establishes that TTR 4273 was stationary and TTR 5291 moved through the same DXB airside cargo and apron vicinity during the reported window. The case remains classified as a reported low-speed vehicle-to-vehicle contact under investigation. Physical contact and an exact impact time are not confirmed by telemetry',
        'No operator statement yet - welfare call pending'
      ],
      prompts: [
        'Show the verified telemetry timeline',
        'How was the 11.4 metre estimate derived?',
        'What evidence is still required?',
        'Why is there no g-force value for this event?'
      ],
      recommended: {
        text: 'Obtain CCTV covering approximately 06:34 to 06:36, timestamped photographs and inspection reports for both vehicles, and signed statements from both operators and any witnesses. Confirm the original reported event time and reporting source, vehicle dimensions and GPS antenna positions, and confirm injury status and operational delay from official records. Obtain official event-window acceleration data if available. Preserve the underlying demo records with duplicate rows intact and deduplicate only in the display or analysis layer. Keep preventability and liability pending until corroborating evidence is obtained.',
        primary: 'Contact driver',
        others: [{ title: 'Flag for review' }]
      },
      activity: [
        { text: 'Review limitations noted: physical contact not independently confirmed, no event-window acceleration data, GPS accuracy, antenna placement and vehicle dimensions unavailable, damage and injuries not verified', meta: 'Jul 6 · Clarity AI', kind: 'ai' },
        { text: 'Proximity estimate prepared: approximately 11.4 metres between the closest relevant recorded pass (06:35:22) and the TTR 4273 stationary reference position. Derived, limited GPS proximity estimate', meta: 'Jul 6 · Clarity AI', kind: 'ai' },
        { text: 'Verified demo telemetry attached: 7 records for TTR 4273 and TTR 5291, 06:34:42 to 06:35:37 Asia/Dubai. Exact duplicate rows are hidden in the display layer and retained in the underlying demo dataset', meta: 'Jul 6 · Clarity AI', kind: 'ai' },
        { text: 'Case created from a reported low-speed contact in the DXB airside cargo and apron vicinity. Demo data', meta: 'Jul 6 · Clarity AI', kind: 'ai' }
      ],
      // ── Collision analysis: no telemetry collision signal exists, so no
      // scoring inputs are authored (no speed reduction, stop duration,
      // g-force, proximity or confirmed-impact inputs). scorePresentation
      // frames the resulting 0 score honestly; the engine is untouched.
      collisionAnalysis: {
        majorCollisionDetected: false,
        eventSource: 'Reported incident (no telemetry collision signal)',
        scorePresentation: {
          scoreLabel: 'Automated detection confidence',
          interpretation: 'No telemetry collision signature for the reported event window',
          assessments: [
            ['Evidence assessment', 'Physical contact reported, not independently confirmed'],
            ['Investigation status', 'In review'],
            ['Final cause, preventability and liability', 'Undetermined']
          ],
          note: 'The automated score reflects available telemetry only. The reported incident remains under investigation and requires corroborating evidence.'
        },
        observedSignals: [
          { text: 'TTR 4273 recorded stationary at 0 km/h throughout the reported event window', source: 'demoTelemetry' },
          { text: 'TTR 5291 recorded moving through the same area at 2 to 14 km/h between 06:34:54 and 06:35:37', source: 'demoTelemetry' },
          { text: 'Closest relevant recorded pass at 06:35:22 with an approximate 11.4 metre GPS separation (limited estimate)', source: 'derived' },
          { text: 'Low-speed contact between the two vehicles reported at approximately 06:35', source: 'reported' }
        ],
        limitations: [
          { text: 'Physical contact is reported, not independently confirmed by the demo telemetry', source: 'reported' },
          { text: 'The 06:35:22 record is the closest relevant recorded pass, not a confirmed impact time', source: 'derived' },
          { text: 'The positions in the 11.4 metre estimate were not recorded at the same second' },
          { text: 'GPS accuracy, GPS antenna placement and vehicle dimensions are unavailable', source: 'unavailable' },
          { text: 'TTR 4273 shows approximately 7.7 metres of GPS drift while reporting 0 km/h', source: 'demoTelemetry' },
          { text: 'The proximity estimate cannot establish physical clearance or confirm contact', source: 'derived' },
          { text: 'Event-window acceleration data unavailable: no verified acceleration or g-force records between 06:34 and 06:36', source: 'unavailable' },
          { text: 'TTR 5291 did not record an immediate stop after the closest pass; its recorded speed reached 14 km/h at 06:35:37', source: 'demoTelemetry' },
          { text: 'Damage, injuries, contact geometry, cause, preventability and liability are undetermined', source: 'undetermined' }
        ]
      },
      collisionAnalysisSources: {
        majorCollisionDetected: 'demoTelemetry'
      },
      // No peerComparison: the package contains no peer data.
      accident: {
        status: 'Driver contact required',
        pinLabel: 'Reported contact area',
        driver: { name: 'Driver identity not confirmed', id: 'Not provided', initials: '?', phone: 'Not provided' },
        vehicle: 'TTR 4273 and TTR 5291',
        detectedSeverity: 'Pending injury and damage confirmation',
        location: 'DXB airside cargo and apron vicinity',
        when: 'Jul 6, 2026 · approx. 06:35',
        videoAvailable: 'Demo reconstruction playback (8 s), not camera footage',
        keyQuestions: [
          'Is the operator safe, and is anyone injured?',
          'Are emergency services required?',
          'Is either vehicle blocking the apron or service road?',
          'Did the vehicle bodies make contact, and where?',
          'What happened, in the operator\'s own words?'
        ],
        details: {
          injuries: 'Not verified. Requires confirmation',
          thirdParty: 'Reported contact between TTR 4273 and TTR 5291. Not independently confirmed',
          police: 'Not verified. Requires confirmation',
          towing: 'Not verified. Requires confirmation',
          vehicleCondition: 'Damage not verified. Requires inspection of both vehicles'
        },
        insurer: {
          name: 'Requires confirmation', policy: 'Requires confirmation',
          destination: '', webhook: ''
        },
        photos: [],
        welfareCall: null
      }
    },
  ];

  window.DNATA_DATA = {
    categories: CATEGORIES,
    categoryOrder: CATEGORY_ORDER,
    users: USERS,
    statuses: STATUSES,
    insurer: INSURER,
    fnolInternal: FNOL_INTERNAL,
    accidentStatuses: ACCIDENT_STATUSES,
    digests: DIGESTS,
    streak: STREAK,
    cases: CASES
  };
})();
