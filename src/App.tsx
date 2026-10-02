import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import {
  Anchor,
  AppShell,
  Badge,
  Burger,
  Button,
  Card,
  CopyButton,
  Divider,
  Group,
  NavLink,
  Paper,
  Progress,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  TextInput,
  PasswordInput,
  ThemeIcon,
  Title,
  Tooltip,
  ActionIcon,
  useMantineColorScheme,
  Box,
  Notification,
  SegmentedControl,
  Select,
} from '@mantine/core';
import {
  Activity,
  Check,
  CircleHelp,
  ClipboardList,
  Copy,
  ExternalLink,
  LayoutDashboard,
  Moon,
  Pause,
  Plane,
  Play,
  Save,
  Settings2,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import type { AirportFormat, FlightState, Settings, SimulatorType, Snapshot, TimeMode } from './types';
import { defaultSettings, presets } from './types';
import { flightLevel, getCountry, getVatsimMapUrl, renderTemplate, sanitizeTemplate } from './utils';
import SetupWizard from './SetupWizard';
import { SkyStatsMark } from './components/SkyStatsLogo';
import { VatsimLogo, VatsimMark } from './components/VatsimLogo';
import { DiscordLogo } from './components/DiscordLogo';

type Page = 'Dashboard' | 'Flight' | 'Presence Designer' | 'Presets' | 'Settings' | 'About';

interface NavItem {
  id: Page;
  label: string;
  icon: typeof Activity;
  description: string;
  group: 'Operations' | 'Configuration' | 'System';
}

const navItems: NavItem[] = [
  { id: 'Dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Live overview & stats', group: 'Operations' },
  { id: 'Flight', label: 'Flight', icon: Plane, description: 'Avionics telemetry', group: 'Operations' },
  { id: 'Presence Designer', label: 'Presence Designer', icon: SlidersHorizontal, description: 'Format activity lines', group: 'Operations' },
  { id: 'Presets', label: 'Presets', icon: ClipboardList, description: 'Layout templates', group: 'Configuration' },
  { id: 'Settings', label: 'Settings', icon: Settings2, description: 'Credentials & runtime', group: 'Configuration' },
  { id: 'About', label: 'About', icon: CircleHelp, description: 'Version & license', group: 'System' },
];

const previewFlight: FlightState = {
  cid: 1234567,
  callsign: 'RYR8AB',
  departure: 'LBSF',
  departureName: 'Sofia',
  arrival: 'EGLL',
  arrivalName: 'London Heathrow',
  aircraft: 'B738',
  latitude: 48.31,
  longitude: 8.62,
  altitude: 36000,
  groundspeed: 452,
  heading: 288,
  route: 'N161 ARMAG UN871 DITAM DCT DET',
  frequency: '132.950',
  phase: 'Cruising',
  distanceRemaining: 694,
  progress: 42,
  timeRemaining: 6120,
  elapsedTime: 4440,
  startTime: Math.floor(Date.now() / 1000) - 4440,
  eta: '17:31Z',
};

function headingToCardinal(hdg: number | null): string {
  if (hdg === null) return '';
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(hdg / 22.5) % 16;
  return directions[index];
}

function DiscordPreviewCard({
  settings,
  flight,
  showButtons = true,
}: {
  settings: Settings;
  flight: FlightState | null;
  showButtons?: boolean;
}) {
  const data = flight ?? previewFlight;
  const details = renderTemplate(settings.detailsTemplate, data, settings);
  const state = renderTemplate(settings.stateTemplate, data, settings);
  const mapUrl = getVatsimMapUrl(data, settings);

  const isElapsed = settings.timeMode === 'elapsed';
  const isHidden = settings.timeMode === 'none';

  const timeSeconds = isElapsed ? (data.elapsedTime ?? 4440) : (data.timeRemaining ?? 3600);
  const hours = Math.floor(timeSeconds / 3600);
  const minutes = Math.floor((timeSeconds % 3600) / 60);
  const seconds = Math.floor(timeSeconds % 60);
  const timeFormatted = hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      style={{
        borderRadius: 12,
        border: '1px solid #2b2d31',
        backgroundColor: '#1e1f22',
        padding: '16px',
        color: '#dbdee1',
        fontFamily: 'gg sans, "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#949ba4', marginBottom: 12 }}>
        <Activity size={12} /> Playing a Game
      </div>

      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 12,
              backgroundColor: '#2b2d31',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            <SkyStatsMark size={32} />
          </div>
          {settings.simulator !== 'none' ? (
            <Tooltip
              label={
                settings.simulator === 'msfs2020'
                  ? 'Microsoft Flight Simulator 2020'
                  : settings.simulator === 'xplane'
                  ? 'X-Plane'
                  : 'Microsoft Flight Simulator 2024'
              }
              position="bottom"
              withArrow
            >
              <div
                style={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  backgroundColor: '#1e1f22',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 2px #1e1f22',
                  overflow: 'hidden',
                }}
              >
                <img
                  src={
                    settings.simulator === 'msfs2020'
                      ? '/msfs2020.png'
                      : settings.simulator === 'xplane'
                      ? '/xplane.png'
                      : '/msfs2024.png'
                  }
                  alt="Sim"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            </Tooltip>
          ) : (
            <div
              style={{
                position: 'absolute',
                bottom: -4,
                right: -4,
                width: 18,
                height: 18,
                borderRadius: '50%',
                backgroundColor: '#1e1f22',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#23a55a' }} />
            </div>
          )}
        </div>

        <div style={{ minWidth: 0, flex: 1, lineHeight: 1.3 }}>
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 700,
              color: '#ffffff',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
            title="Click to open flight on VATSIM Radar Map"
          >
            <span>{data.callsign ? `Flying as ${data.callsign} on VATSIM` : 'SkyStats'}</span>
            <span
              style={{
                borderRadius: 4,
                backgroundColor: '#5865f2',
                padding: '1px 4px',
                fontSize: 9,
                fontWeight: 700,
                color: '#ffffff',
              }}
            >
              APP
            </span>
            <ExternalLink size={11} color="#949ba4" />
          </a>

          <div
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#ffffff',
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={details}
          >
            {details || 'En route on VATSIM'}
          </div>

          <div
            style={{
              fontSize: 12,
              color: '#949ba4',
              marginTop: 1,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={state}
          >
            {state || 'In flight'}
          </div>

          {!isHidden && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#23a55a', fontWeight: 600, marginTop: 4 }}>
              {isElapsed ? (
                <>⏱ {timeFormatted} elapsed</>
              ) : (
                <>⌛ {timeFormatted} left</>
              )}
            </div>
          )}
        </div>
      </div>

      {showButtons && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #2b2d31', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              borderRadius: 4,
              backgroundColor: '#2b2d31',
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 500,
              color: '#ffffff',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <ExternalLink size={12} color="#949ba4" /> {data.callsign ? `Track ${data.callsign} on Map` : 'View VATSIM Map'}
          </a>
          <a
            href="https://github.com/yani2173/SkyStats/releases"
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              borderRadius: 4,
              backgroundColor: '#2b2d31',
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 500,
              color: '#ffffff',
              textDecoration: 'none',
              cursor: 'pointer',
            }}
          >
            <ExternalLink size={12} color="#949ba4" /> Download SkyStats
          </a>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [page, setPage] = useState<Page>('Dashboard');
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [draft, setDraft] = useState<Settings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);

  const { colorScheme, setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    let unlistenSnapshot: (() => void) | undefined;
    let unlistenNavigate: (() => void) | undefined;

    invoke<Snapshot>('get_snapshot')
      .then(value => {
        setSnapshot(value);
        setDraft(value.settings);
        setWizardOpen(!value.settings.setupComplete);
      })
      .catch(() => {
        setError('');
      });

    listen<Snapshot>('snapshot', event => {
      setSnapshot(event.payload);
    }).then(unlisten => {
      unlistenSnapshot = unlisten;
    });

    listen<string>('navigate', event => {
      if (event.payload === 'settings') setPage('Settings');
      else if (event.payload === 'flight') setPage('Flight');
    }).then(unlisten => {
      unlistenNavigate = unlisten;
    });

    return () => {
      unlistenSnapshot?.();
      unlistenNavigate?.();
    };
  }, []);

  const update = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setDraft(current => ({ ...current, [key]: value }));

  const save = async (next = draft) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await invoke<Snapshot>('save_settings', { settings: next });
      setSnapshot(result);
      setDraft(result.settings);
      setNotice('Settings saved successfully');
      window.setTimeout(() => setNotice(''), 3000);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setSaving(false);
    }
  };

  const applyPreset = (name: keyof typeof presets) => {
    const next = { ...draft, ...presets[name], preset: name };
    setDraft(next);
    void save(next);
  };

  const toggleBroadcast = () => {
    const next = { ...draft, enabled: !draft.enabled };
    setDraft(next);
    void save(next);
  };

  const toggleTheme = () => {
    const nextTheme = colorScheme === 'dark' ? 'light' : 'dark';
    setColorScheme(nextTheme);
    update('theme', nextTheme);
  };

  const flight = snapshot?.flight ?? null;
  const hasFlight = !!flight;
  const currentStatus = snapshot?.vatsimStatus ?? 'Waiting';
  const discordStatus = snapshot?.discordStatus ?? 'Connected';

  return (
    <AppShell
      header={{ height: 48 }}
      navbar={{
        width: 220,
        breakpoint: 'sm',
        collapsed: { mobile: !sidebarOpen },
      }}
      padding="md"
    >
      {/* Fixed Desktop Header */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="xs">
            <Burger
              opened={sidebarOpen}
              onClick={() => setSidebarOpen(o => !o)}
              hiddenFrom="sm"
              size="sm"
            />
            <SkyStatsMark size={22} />
            <Text fw={600} size="xs" c="bright">
              SkyStats
            </Text>
            <Text size="xs" c="dimmed">
              / {page}
            </Text>
          </Group>

          <Group gap="xs">
            <Badge
              size="sm"
              variant="dot"
              color={hasFlight ? 'teal' : 'gray'}
            >
              {hasFlight ? 'Live Flight' : 'Radar Standby'}
            </Badge>

            <Tooltip label={draft.enabled ? 'Pause Discord broadcast' : 'Resume Discord broadcast'}>
              <Button
                size="xs"
                variant={draft.enabled ? 'light' : 'filled'}
                color={draft.enabled ? 'teal' : 'orange'}
                leftSection={draft.enabled ? <Pause size={13} /> : <Play size={13} />}
                onClick={toggleBroadcast}
              >
                {draft.enabled ? 'Pause Broadcast' : 'Resume Broadcast'}
              </Button>
            </Tooltip>

            <Tooltip label={`Switch to ${colorScheme === 'dark' ? 'Light' : 'Dark'} mode`}>
              <ActionIcon variant="default" size="sm" onClick={toggleTheme}>
                {colorScheme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      {/* Modern Desktop Navbar */}
      <AppShell.Navbar p="xs" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <Stack gap="xs">
          {/* Navigation Items */}
          <Stack gap={2}>
            {(['Operations', 'Configuration', 'System'] as const).map(group => (
              <Box key={group} mb="xs">
                <Text size="10px" fw={700} tt="uppercase" c="dimmed" px="xs" mb={4}>
                  {group}
                </Text>
                {navItems
                  .filter(item => item.group === group)
                  .map(({ id, label, icon: Icon, description }) => (
                    <NavLink
                      key={id}
                      label={label}
                      description={description}
                      leftSection={<Icon size={16} strokeWidth={2} />}
                      active={page === id}
                      onClick={() => {
                        setPage(id);
                        setSidebarOpen(false);
                      }}
                      style={{ borderRadius: 6 }}
                    />
                  ))}
              </Box>
            ))}
          </Stack>
        </Stack>

        {/* Bottom VATSIM Pilot Status Deck */}
        <Paper p="xs" withBorder radius="md" bg="var(--mantine-color-dark-8)">
          <Group justify="space-between" mb={4}>
            <VatsimMark className="h-3 w-auto" />
            <Badge
              size="xs"
              variant="dot"
              color={hasFlight ? 'teal' : 'gray'}
            >
              {currentStatus}
            </Badge>
          </Group>
          <Text size="xs" ff="monospace" fw={600} truncate>
            {hasFlight
              ? `${flight.callsign} • ${flight.aircraft}`
              : draft.cid
              ? `CID ${draft.cid}`
              : 'No CID Linked'}
          </Text>
        </Paper>
      </AppShell.Navbar>

      {/* Main Workspace Container */}
      <AppShell.Main>
        <Box maw={980} mx="auto" py="xs">
          {/* =================================================================
              DASHBOARD
             ================================================================= */}
          {page === 'Dashboard' && (
            <Stack gap="lg">
              <Group justify="space-between" align="flex-end">
                <div>
                  <Title order={3} fw={600}>
                    Operations Dashboard
                  </Title>
                  <Text size="xs" c="dimmed" mt={2}>
                    Live VATSIM telemetry stream and Discord presence broadcaster.
                  </Text>
                </div>
                <Group gap="xs">
                  <Button
                    variant="default"
                    size="xs"
                    leftSection={<SlidersHorizontal size={14} />}
                    onClick={() => setPage('Presence Designer')}
                  >
                    Customize Format
                  </Button>
                  <Button
                    variant="filled"
                    color="blue"
                    size="xs"
                    leftSection={<Plane size={14} />}
                    onClick={() => setPage('Flight')}
                  >
                    Avionics Deck
                  </Button>
                </Group>
              </Group>

              {/* Status Metric Grid */}
              <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm">
                <Card withBorder padding="sm" radius="md">
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed" fw={600}>Discord RPC</Text>
                    <DiscordLogo className="h-3.5 w-3.5 text-[#5865f2]" />
                  </Group>
                  <Text size="md" fw={700} mt={4}>
                    {discordStatus}
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    {draft.enabled ? 'Broadcast active' : 'Broadcasting paused'}
                  </Text>
                </Card>

                <Card withBorder padding="sm" radius="md">
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed" fw={600}>VATSIM Network</Text>
                    <VatsimMark className="h-2.5 w-auto" />
                  </Group>
                  <Text size="md" fw={700} mt={4}>
                    {currentStatus}
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    {draft.cid ? `Pilot CID ${draft.cid}` : 'CID not configured'}
                  </Text>
                </Card>

                <Card withBorder padding="sm" radius="md">
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed" fw={600}>Active Route</Text>
                    <ClipboardList size={14} />
                  </Group>
                  <Text size="md" fw={700} mt={4}>
                    {flight?.arrival ? `${flight.departure} → ${flight.arrival}` : 'Standby'}
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    {flight?.aircraft ? `Type: ${flight.aircraft}` : 'No filed flight'}
                  </Text>
                </Card>

                <Card withBorder padding="sm" radius="md">
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed" fw={600}>Presence Layout</Text>
                    <SlidersHorizontal size={14} />
                  </Group>
                  <Text size="md" fw={700} mt={4}>
                    {draft.preset || 'Standard'}
                  </Text>
                  <Text
                    size="xs"
                    c="blue"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setPage('Presets')}
                    mt={2}
                  >
                    Change template →
                  </Text>
                </Card>
              </SimpleGrid>

              {/* Hero Flight Display */}
              {hasFlight ? (
                <Card withBorder padding="lg" radius="md">
                  <Stack gap="md">
                    {/* Header Strip */}
                    <Group justify="space-between">
                      <Group gap="xs">
                        <Text ff="monospace" size="xl" fw={800} c="bright">
                          {flight.callsign}
                        </Text>
                        <Badge variant="outline" size="sm" ff="monospace">
                          {flight.aircraft ?? 'AIRCRAFT'}
                        </Badge>
                        <Badge variant="light" color="teal" size="sm">
                          {flight.phase}
                        </Badge>
                        {getCountry(flight.latitude, flight.longitude) && (
                          <Badge variant="light" color="blue" size="sm">
                            Over {getCountry(flight.latitude, flight.longitude)}
                          </Badge>
                        )}
                      </Group>
                      <Text size="xs" ff="monospace" c="dimmed">
                        VATSIM CID: <Text span fw={600} c="bright">{flight.cid ?? draft.cid}</Text>
                      </Text>
                    </Group>

                    {/* Flight Track Bar */}
                    <Stack gap="xs" py="xs">
                      <Group justify="space-between" align="center">
                        <div>
                          <Text ff="monospace" size="1.75rem" fw={800} lh={1}>
                            {flight.departure ?? '----'}
                          </Text>
                          <Text size="xs" c="dimmed" mt={2}>Origin</Text>
                        </div>

                        <Box style={{ flex: 1 }} px="xl">
                          <Group justify="space-between" mb={4}>
                            <Text size="xs" ff="monospace" c="dimmed">
                              {Math.round(flight.progress ?? 0)}% Flown
                            </Text>
                            <Text size="xs" ff="monospace" c="dimmed">
                              {flight.distanceRemaining !== null ? `${Math.round(flight.distanceRemaining)} NM Remaining` : ''}
                            </Text>
                          </Group>
                          <Progress
                            value={flight.progress ?? 0}
                            size="sm"
                            radius="xl"
                            color="blue"
                          />
                        </Box>

                        <div style={{ textAlign: 'right' }}>
                          <Text ff="monospace" size="1.75rem" fw={800} lh={1}>
                            {flight.arrival ?? '----'}
                          </Text>
                          <Text size="xs" c="dimmed" mt={2}>Destination</Text>
                        </div>
                      </Group>
                    </Stack>

                    {/* Avionics Telemetry Deck */}
                    <Paper p="sm" withBorder radius="md">
                      <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="xs">
                        <Box px="xs">
                          <Text size="10px" fw={700} tt="uppercase" c="dimmed">ALTITUDE</Text>
                          <Text size="sm" fw={700} ff="monospace" c="bright">{flightLevel(flight.altitude) ?? '---'}</Text>
                          <Text size="11px" c="dimmed">{flight.altitude !== null ? `${flight.altitude.toLocaleString()} ft` : 'Ground'}</Text>
                        </Box>
                        <Box px="xs">
                          <Text size="10px" fw={700} tt="uppercase" c="dimmed">GROUND SPEED</Text>
                          <Text size="sm" fw={700} ff="monospace" c="bright">{flight.groundspeed !== null ? `${flight.groundspeed} kts` : '---'}</Text>
                          <Text size="11px" c="dimmed">{flight.groundspeed !== null ? `~M ${(flight.groundspeed / 580).toFixed(2)}` : '0 kts'}</Text>
                        </Box>
                        <Box px="xs">
                          <Text size="10px" fw={700} tt="uppercase" c="dimmed">HEADING</Text>
                          <Text size="sm" fw={700} ff="monospace" c="bright">{flight.heading !== null ? `${flight.heading}°` : '---'}</Text>
                          <Text size="11px" c="dimmed">{headingToCardinal(flight.heading)} Track</Text>
                        </Box>
                        <Box px="xs">
                          <Text size="10px" fw={700} tt="uppercase" c="dimmed">TIME REMAINING</Text>
                          <Text size="sm" fw={700} ff="monospace" c="bright">
                            {flight.timeRemaining !== null ? `${Math.floor(flight.timeRemaining / 3600)}h ${Math.floor((flight.timeRemaining % 3600) / 60)}m` : '---'}
                          </Text>
                          <Text size="11px" c="dimmed">ETA {flight.eta ?? '---'}</Text>
                        </Box>
                        <Box px="xs">
                          <Text size="10px" fw={700} tt="uppercase" c="dimmed">DISTANCE</Text>
                          <Text size="sm" fw={700} ff="monospace" c="bright">{flight.distanceRemaining !== null ? `${Math.round(flight.distanceRemaining)} NM` : '---'}</Text>
                          <Text size="11px" c="dimmed">Direct route</Text>
                        </Box>
                        <Box px="xs">
                          <Text size="10px" fw={700} tt="uppercase" c="dimmed">COM 1 RADIO</Text>
                          <Text size="sm" fw={700} ff="monospace" c="bright">{flight.frequency ?? '122.800'}</Text>
                          <Text size="11px" c="dimmed">{flight.frequency ? 'VHF Active' : 'Unicom'}</Text>
                        </Box>
                      </SimpleGrid>
                    </Paper>
                  </Stack>
                </Card>
              ) : (
                /* Clean Standby State */
                <Paper p="xl" withBorder radius="md" style={{ textAlign: 'center' }}>
                  <Stack align="center" gap="sm">
                    <SkyStatsMark size={42} />
                    <div>
                      <Title order={4} fw={600}>
                        No Active Flight Detected
                      </Title>
                      <Text size="xs" c="dimmed" maw={420} mx="auto" mt={4}>
                        {draft.cid
                          ? `Monitoring VATSIM for pilot CID ${draft.cid}. Once you connect your flight simulator, telemetry updates automatically.`
                          : 'Configure your VATSIM pilot CID in Settings to track your live flights.'}
                      </Text>
                    </div>
                    <Group gap="xs" mt="xs">
                      <Button
                        variant="filled"
                        color="blue"
                        size="xs"
                        onClick={() => setPage('Settings')}
                      >
                        {draft.cid ? 'Update CID' : 'Configure VATSIM CID'}
                      </Button>
                      <Button
                        variant="default"
                        size="xs"
                        onClick={() => setPage('Presence Designer')}
                      >
                        Configure Presence
                      </Button>
                    </Group>
                  </Stack>
                </Paper>
              )}

              {/* Discord Live Preview & Settings Split */}
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Card withBorder padding="md" radius="md">
                  <Group justify="space-between" mb="xs">
                    <div>
                      <Text size="sm" fw={600}>
                        Discord Rich Presence
                      </Text>
                      <Text size="xs" c="dimmed">
                        Live profile activity simulation
                      </Text>
                    </div>
                    <Button
                      variant="subtle"
                      size="xs"
                      onClick={() => setPage('Presence Designer')}
                    >
                      Edit Format →
                    </Button>
                  </Group>

                  <DiscordPreviewCard settings={draft} flight={flight} />
                </Card>

                <Card withBorder padding="md" radius="md">
                  <Text size="sm" fw={600}>
                    Presence Controls
                  </Text>
                  <Text size="xs" c="dimmed" mb="sm">
                    Toggle broadcast state and background runtime
                  </Text>

                  <Stack gap="sm">
                    <Switch
                      label="Discord Rich Presence"
                      description="Broadcast active telemetry to local Discord client"
                      checked={draft.enabled}
                      onChange={e => {
                        const v = e.currentTarget.checked;
                        update('enabled', v);
                        void save({ ...draft, enabled: v });
                      }}
                    />

                    <Divider />

                    <Switch
                      label="Minimize to System Tray"
                      description="Keep tracking flight in background when window is closed"
                      checked={draft.minimizeToTray}
                      onChange={e => {
                        const v = e.currentTarget.checked;
                        update('minimizeToTray', v);
                        void save({ ...draft, minimizeToTray: v });
                      }}
                    />
                  </Stack>
                </Card>
              </SimpleGrid>
            </Stack>
          )}

          {/* =================================================================
              FLIGHT
             ================================================================= */}
          {page === 'Flight' && (
            <Stack gap="lg">
              <Group justify="space-between" align="flex-end">
                <div>
                  <Title order={3} fw={600}>
                    Flight Telemetry
                  </Title>
                  <Text size="xs" c="dimmed" mt={2}>
                    Raw avionics and aircraft navigation data from VATSIM.
                  </Text>
                </div>
                {flight && (
                  <CopyButton
                    value={`${flight.callsign} | ${flight.departure} -> ${flight.arrival} | ${flight.aircraft} | FL${flight.altitude ? Math.round(flight.altitude / 100) : ''}`}
                  >
                    {({ copied, copy }) => (
                      <Button
                        variant="default"
                        size="xs"
                        leftSection={copied ? <Check size={14} /> : <Copy size={14} />}
                        onClick={copy}
                      >
                        {copied ? 'Copied' : 'Copy Flight Strip'}
                      </Button>
                    )}
                  </CopyButton>
                )}
              </Group>

              {flight ? (
                <Card withBorder padding="md" radius="md">
                  <Stack gap="md">
                    <Group justify="space-between" pb="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
                      <Group gap="xs">
                        <Text ff="monospace" size="xl" fw={800} c="bright">
                          {flight.callsign}
                        </Text>
                        <Badge variant="filled" size="md" ff="monospace" color="blue">
                          {flight.departure ?? 'XXXX'} → {flight.arrival ?? 'YYYY'}
                        </Badge>
                        <Badge variant="outline" size="md" ff="monospace">
                          {flight.aircraft}
                        </Badge>
                        {getCountry(flight.latitude, flight.longitude) && (
                          <Badge variant="light" color="blue" size="md">
                            Over {getCountry(flight.latitude, flight.longitude)}
                          </Badge>
                        )}
                      </Group>
                      <Badge color="teal" variant="light" size="md">
                        {flight.phase}
                      </Badge>
                    </Group>

                    {/* Flight Phase Visual Sequence */}
                    <Box py="xs">
                      <Group justify="space-between" px="sm">
                        {['Preflight', 'Taxi', 'Climb', 'Cruising', 'Descent', 'Approach', 'Landed'].map(p => {
                          const isActive = flight.phase?.toLowerCase() === p.toLowerCase();
                          return (
                            <Stack key={p} align="center" gap={4}>
                              <ThemeIcon
                                size="xs"
                                radius="xl"
                                variant={isActive ? 'filled' : 'outline'}
                                color={isActive ? 'teal' : 'gray'}
                              >
                                {isActive && <Check size={10} />}
                              </ThemeIcon>
                              <Text size="11px" fw={isActive ? 700 : 500} c={isActive ? 'teal' : 'dimmed'}>
                                {p}
                              </Text>
                            </Stack>
                          );
                        })}
                      </Group>
                    </Box>

                    {/* Avionics Grid */}
                    <Paper p="md" withBorder radius="md">
                      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                        <Box>
                          <Text size="10px" fw={700} tt="uppercase" c="dimmed">AIRCRAFT</Text>
                          <Text size="xs" fw={700} ff="monospace" c="bright">{flight.aircraft ?? 'Unknown'}</Text>
                        </Box>
                        <Box>
                          <Text size="10px" fw={700} tt="uppercase" c="dimmed">ALTITUDE</Text>
                          <Text size="xs" fw={700} ff="monospace" c="bright">
                            {flight.altitude !== null ? `${flightLevel(flight.altitude)} (${flight.altitude.toLocaleString()} ft)` : 'Ground'}
                          </Text>
                        </Box>
                        <Box>
                          <Text size="10px" fw={700} tt="uppercase" c="dimmed">GROUND SPEED</Text>
                          <Text size="xs" fw={700} ff="monospace" c="bright">{flight.groundspeed !== null ? `${flight.groundspeed} kts` : '0 kts'}</Text>
                        </Box>
                        <Box>
                          <Text size="10px" fw={700} tt="uppercase" c="dimmed">HEADING</Text>
                          <Text size="xs" fw={700} ff="monospace" c="bright">{flight.heading !== null ? `${flight.heading}° (${headingToCardinal(flight.heading)})` : '---'}</Text>
                        </Box>
                        <Box>
                          <Text size="10px" fw={700} tt="uppercase" c="dimmed">DISTANCE REMAINING</Text>
                          <Text size="xs" fw={700} ff="monospace" c="bright">{flight.distanceRemaining !== null ? `${Math.round(flight.distanceRemaining)} NM` : '---'}</Text>
                        </Box>
                        <Box>
                          <Text size="10px" fw={700} tt="uppercase" c="dimmed">ETA</Text>
                          <Text size="xs" fw={700} ff="monospace" c="bright">{flight.eta ?? 'Calculating...'}</Text>
                        </Box>
                        <Box>
                          <Text size="10px" fw={700} tt="uppercase" c="dimmed">COORDINATES</Text>
                          <Text size="xs" fw={700} ff="monospace" c="bright">
                            {flight.latitude !== null && flight.longitude !== null
                              ? `${flight.latitude.toFixed(4)}°, ${flight.longitude.toFixed(4)}°`
                              : 'Unavailable'}
                          </Text>
                        </Box>
                        <Box>
                          <Text size="10px" fw={700} tt="uppercase" c="dimmed">COM RADIO</Text>
                          <Text size="xs" fw={700} ff="monospace" c="bright">{flight.frequency ?? '122.800'}</Text>
                        </Box>
                      </SimpleGrid>
                    </Paper>

                    {/* Filed Route */}
                    <Paper p="sm" withBorder radius="md">
                      <Group justify="space-between" mb={4}>
                        <Text size="10px" fw={700} tt="uppercase" c="dimmed">FILED FLIGHT PLAN ROUTE</Text>
                        {flight.route && (
                          <CopyButton value={flight.route}>
                            {({ copied, copy }) => (
                              <Button
                                variant="subtle"
                                size="compact-xs"
                                leftSection={copied ? <Check size={12} /> : <Copy size={12} />}
                                onClick={copy}
                              >
                                {copied ? 'Copied' : 'Copy Route'}
                              </Button>
                            )}
                          </CopyButton>
                        )}
                      </Group>
                      <Text size="xs" ff="monospace" c="dimmed">
                        {flight.route || 'No route filed.'}
                      </Text>
                    </Paper>
                  </Stack>
                </Card>
              ) : (
                <Paper p="xl" withBorder radius="md" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                  <Title order={4} fw={600}>No Active Flight</Title>
                  <Text size="xs" c="dimmed" mt={4}>Connect to VATSIM to inspect live flight telemetry and avionics.</Text>
                  {!draft.cid && (
                    <Button variant="default" size="xs" mt="md" onClick={() => setPage('Settings')}>Configure VATSIM CID</Button>
                  )}
                </Paper>
              )}
            </Stack>
          )}

          {/* =================================================================
              PRESENCE DESIGNER
             ================================================================= */}
          {page === 'Presence Designer' && (
            <Stack gap="lg">
              <Group justify="space-between" align="flex-end">
                <div>
                  <Title order={3} fw={600}>
                    Presence Designer
                  </Title>
                  <Text size="xs" c="dimmed" mt={2}>
                    Customize template tokens for your Discord profile activity lines.
                  </Text>
                </div>
                <Button
                  variant="filled"
                  color="blue"
                  size="xs"
                  loading={saving}
                  leftSection={<Save size={14} />}
                  onClick={() => void save()}
                >
                  Save Design
                </Button>
              </Group>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Card withBorder padding="md" radius="md">
                  <Stack gap="md">
                    <div>
                      <Group justify="space-between" align="center" mb={4}>
                        <Text size="sm" fw={600}>Activity Lines</Text>
                        <Badge size="xs" variant="light" color="teal">Safe Mode Active</Badge>
                      </Group>
                      <Text size="xs" c="dimmed">Custom freeform text is locked to prevent Discord policy violations. Use token pills below to format your presence.</Text>
                    </div>

                    <TextInput
                      label="Details Line"
                      description="Upper line of Discord activity (tokens & separators only)"
                      maxLength={128}
                      value={draft.detailsTemplate}
                      onChange={e => update('detailsTemplate', sanitizeTemplate(e.currentTarget.value))}
                      placeholder="{departure} → {arrival} • VATSIM"
                      size="sm"
                    />

                    <TextInput
                      label="State Line"
                      description="Lower line of Discord activity (tokens & separators only)"
                      maxLength={128}
                      value={draft.stateTemplate}
                      onChange={e => update('stateTemplate', sanitizeTemplate(e.currentTarget.value))}
                      placeholder="{callsign} • {aircraft} • {flight_level}"
                      size="sm"
                    />

                    <Box>
                      <Text size="xs" fw={500} mb={4}>Activity Timer Display</Text>
                      <SegmentedControl
                        value={draft.timeMode}
                        onChange={val => update('timeMode', val as TimeMode)}
                        data={[
                          { label: '⌛ Time Left (Countdown)', value: 'remaining' },
                          { label: '⏱ Time Elapsed (Flight Time)', value: 'elapsed' },
                          { label: 'Hidden', value: 'none' },
                        ]}
                        size="xs"
                        fullWidth
                      />
                      <Text size="11px" c="dimmed" mt={4}>
                        {draft.timeMode === 'remaining'
                          ? 'Counts down to estimated arrival (e.g. 58:44 left)'
                          : draft.timeMode === 'elapsed'
                          ? 'Counts up total duration airborne / logged in (e.g. 1:04:34 elapsed)'
                          : 'No timer shown on your Discord activity'}
                      </Text>
                    </Box>

                    <Divider />

                    <Box>
                      <Text size="xs" fw={500} mb={4}>Smart Mode Airport Display</Text>
                      <SegmentedControl
                        value={draft.airportFormat ?? 'name'}
                        onChange={val => update('airportFormat', val as AirportFormat)}
                        data={[
                          { label: 'City / Name (Glasgow)', value: 'name' },
                          { label: 'ICAO + Name (EGPF (Glasgow))', value: 'both' },
                          { label: 'ICAO (EGPF)', value: 'icao' },
                        ]}
                        size="xs"
                        fullWidth
                      />
                      <Text size="11px" c="dimmed" mt={4}>
                        Controls whether smart status displays the city or airport name, ICAO code, or both.
                      </Text>
                    </Box>

                    <Select
                      label="Approach & Landing Phrase"
                      description="Preset template when on approach or landing"
                      value={draft.approachTemplate ?? 'On Approach to {airport}'}
                      onChange={val => update('approachTemplate', val || 'On Approach to {airport}')}
                      data={[
                        { value: 'On Approach to {airport}', label: 'On Approach to {airport}' },
                        { value: 'On Final for {airport}', label: 'On Final for {airport}' },
                        { value: 'Landing at {airport}', label: 'Landing at {airport}' },
                        { value: 'Inbound to {airport}', label: 'Inbound to {airport}' },
                        { value: 'Arriving at {airport}', label: 'Arriving at {airport}' },
                        { value: 'Descending into {airport}', label: 'Descending into {airport}' },
                      ]}
                      size="xs"
                    />

                    <Divider />

                    <Box>
                      <Text size="xs" fw={500} mb={4}>Flight Simulator Badge (Discord Small Icon)</Text>
                      <SegmentedControl
                        value={draft.simulator ?? 'auto'}
                        onChange={val => update('simulator', val as SimulatorType)}
                        data={[
                          { label: 'Auto Detect', value: 'auto' },
                          { label: 'MSFS 2024', value: 'msfs2024' },
                          { label: 'MSFS 2020', value: 'msfs2020' },
                          { label: 'X-Plane', value: 'xplane' },
                          { label: 'None', value: 'none' },
                        ]}
                        size="xs"
                        fullWidth
                      />
                      <Text size="11px" c="dimmed" mt={4}>
                        Displays a small badge icon on your Discord presence avatar. Auto-detects if MSFS 2024, MSFS 2020, or X-Plane is running.
                      </Text>
                    </Box>

                    <Divider />

                    {/* Token Vault */}
                    <Stack gap="xs">
                      <Text size="10px" fw={700} tt="uppercase" c="dimmed">Flight Plan Tokens</Text>
                      <Group gap={4}>
                        {['callsign', 'departure', 'arrival', 'departure_name', 'arrival_name', 'aircraft', 'route', 'network'].map(token => (
                          <Button
                            key={token}
                            variant="default"
                            size="compact-xs"
                            onClick={() => {
                              const sep = draft.stateTemplate.length > 0 ? ' • ' : '';
                              update('stateTemplate', `${draft.stateTemplate}${sep}{${token}}`);
                            }}
                          >
                            + {'{' + token + '}'}
                          </Button>
                        ))}
                      </Group>

                      <Text size="10px" fw={700} tt="uppercase" c="dimmed" mt="xs">Telemetry Tokens</Text>
                      <Group gap={4}>
                        {['flight_level', 'altitude', 'groundspeed', 'heading', 'phase'].map(token => (
                          <Button
                            key={token}
                            variant="default"
                            size="compact-xs"
                            onClick={() => {
                              const sep = draft.stateTemplate.length > 0 ? ' • ' : '';
                              update('stateTemplate', `${draft.stateTemplate}${sep}{${token}}`);
                            }}
                          >
                            + {'{' + token + '}'}
                          </Button>
                        ))}
                      </Group>

                      <Text size="10px" fw={700} tt="uppercase" c="dimmed" mt="xs">Radio & Timing Tokens</Text>
                      <Group gap={4}>
                        {['frequency', 'distance_remaining', 'time_remaining', 'eta'].map(token => (
                          <Button
                            key={token}
                            variant="default"
                            size="compact-xs"
                            onClick={() => {
                              const sep = draft.stateTemplate.length > 0 ? ' • ' : '';
                              update('stateTemplate', `${draft.stateTemplate}${sep}{${token}}`);
                            }}
                          >
                            + {'{' + token + '}'}
                          </Button>
                        ))}
                      </Group>

                      <Text size="10px" fw={700} tt="uppercase" c="blue" mt="xs">Smart & Geographic Tokens</Text>
                      <Group gap={4}>
                        {['smart_status', 'approach_target', 'country', 'flying_over', 'airspace'].map(token => (
                          <Button
                            key={token}
                            variant="light"
                            color="blue"
                            size="compact-xs"
                            onClick={() => {
                              const sep = draft.stateTemplate.length > 0 ? ' • ' : '';
                              update('stateTemplate', `${draft.stateTemplate}${sep}{${token}}`);
                            }}
                          >
                            + {'{' + token + '}'}
                          </Button>
                        ))}
                      </Group>
                    </Stack>
                  </Stack>
                </Card>

                {/* Instant Preview Card */}
                <Card withBorder padding="md" radius="md">
                  <Stack gap="md">
                    <div>
                      <Text size="sm" fw={600}>Live Preview</Text>
                      <Text size="xs" c="dimmed">Exact rendering in Discord profile cards</Text>
                    </div>

                    <DiscordPreviewCard settings={draft} flight={flight} />

                    <Paper p="sm" withBorder radius="md">
                      <Text size="xs" fw={600} mb={4}>Formatting Tips:</Text>
                      <Text size="xs" c="dimmed" component="div">
                        <ul style={{ paddingLeft: 16, margin: 0 }}>
                          <li>Use <b>{'{smart_status}'}</b> for automatic contextual text (e.g. "On Approach to Glasgow", "Cruising over Germany at FL360", "Landed at Glasgow").</li>
                          <li>Use <b>{'{arrival_name}'}</b> / <b>{'{departure_name}'}</b> for destination and departure city names (e.g. Glasgow, London Gatwick).</li>
                          <li>Empty or hidden fields are automatically omitted.</li>
                        </ul>
                      </Text>
                    </Paper>
                  </Stack>
                </Card>
              </SimpleGrid>
            </Stack>
          )}

          {/* =================================================================
              PRESETS
             ================================================================= */}
          {page === 'Presets' && (
            <Stack gap="lg">
              <div>
                <Title order={3} fw={600}>
                  Curated Presets
                </Title>
                <Text size="xs" c="dimmed" mt={2}>
                  Select a community-standard or smart geographic presence configuration.
                </Text>
              </div>

              <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
                {(Object.keys(presets) as (keyof typeof presets)[]).map(name => {
                  const isSelected = draft.preset === name;
                  const presetData = presets[name];
                  const tempSettings: Settings = {
                    ...draft,
                    detailsTemplate: presetData.detailsTemplate,
                    stateTemplate: presetData.stateTemplate,
                  };

                  return (
                    <Card
                      key={name}
                      withBorder
                      padding="md"
                      radius="md"
                      onClick={() => applyPreset(name)}
                      style={{
                        cursor: 'pointer',
                        borderColor: isSelected ? 'var(--mantine-color-blue-6)' : undefined,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 16,
                      }}
                    >
                      <Stack gap="xs">
                        <Group justify="space-between">
                          <Text size="sm" fw={700}>{name}</Text>
                          {isSelected && (
                            <Badge size="xs" variant="filled" color="blue">
                              Active
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="dimmed">
                          {name === 'Minimal'
                            ? 'Clean departure and arrival without telemetry clutter.'
                            : name === 'Standard'
                            ? 'Community standard: route, callsign, and cruise flight level.'
                            : name === 'Smart'
                            ? 'Smart contextual text: flying over countries, climb/descent, and live level.'
                            : 'Full telemetry with distance remaining and ETA.'}
                        </Text>
                      </Stack>

                      {/* Mini Discord Preview */}
                      <Box
                        p="xs"
                        style={{
                          borderRadius: 8,
                          backgroundColor: '#1e1f22',
                          border: '1px solid #2b2d31',
                          fontFamily: 'gg sans, sans-serif',
                        }}
                      >
                        <Text size="xs" fw={600} c="#ffffff" truncate>
                          {renderTemplate(presetData.detailsTemplate, previewFlight, tempSettings)}
                        </Text>
                        <Text size="11px" c="#949ba4" truncate mt={2}>
                          {renderTemplate(presetData.stateTemplate, previewFlight, tempSettings)}
                        </Text>
                      </Box>

                      <Button
                        variant={isSelected ? 'light' : 'default'}
                        color={isSelected ? 'blue' : 'gray'}
                        size="xs"
                        fullWidth
                        onClick={e => {
                          e.stopPropagation();
                          applyPreset(name);
                        }}
                      >
                        {isSelected ? 'Applied' : 'Use Preset'}
                      </Button>
                    </Card>
                  );
                })}
              </SimpleGrid>
            </Stack>
          )}

          {/* =================================================================
          {/* =================================================================
              SETTINGS
             ================================================================= */}
          {page === 'Settings' && (
            <Stack gap="lg">
              <Group justify="space-between" align="flex-end">
                <div>
                  <Title order={3} fw={600}>
                    Application Settings
                  </Title>
                  <Text size="xs" c="dimmed" mt={2}>
                    Manage your VATSIM pilot credentials, Discord broadcast, and runtime options.
                  </Text>
                </div>
                <Button
                  variant="filled"
                  color="blue"
                  size="xs"
                  loading={saving}
                  leftSection={<Save size={14} />}
                  onClick={() => void save()}
                >
                  Save Settings
                </Button>
              </Group>

              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                {/* VATSIM Credentials Card */}
                <Card withBorder padding="md" radius="md">
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Group gap="sm">
                        <Paper p={6} withBorder radius="md" bg="var(--mantine-color-dark-8)">
                          <VatsimLogo className="h-4.5 w-auto" />
                        </Paper>
                        <div>
                          <Text size="sm" fw={600}>VATSIM Network</Text>
                          <Text size="xs" c="dimmed">Live pilot data feed</Text>
                        </div>
                      </Group>
                      <Badge variant="dot" color={currentStatus === 'Connected' ? 'teal' : 'gray'}>
                        {currentStatus}
                      </Badge>
                    </Group>

                    <TextInput
                      label="VATSIM Certificate ID"
                      description="Unique pilot number assigned by VATSIM"
                      placeholder="e.g. 1234567"
                      value={draft.cid}
                      onChange={e => update('cid', e.currentTarget.value.replace(/\D/g, ''))}
                      size="sm"
                    />

                    <Group justify="space-between">
                      <Anchor
                        href="https://my.vatsim.net"
                        target="_blank"
                        rel="noreferrer"
                        size="xs"
                        c="blue"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <span>Find your CID on my.vatsim.net</span>
                        <ExternalLink size={12} />
                      </Anchor>
                      <Text size="xs" c="dimmed">
                        {draft.cid ? `Tracking pilot #${draft.cid}` : 'No CID configured'}
                      </Text>
                    </Group>
                  </Stack>
                </Card>

                {/* General Options Card */}
                <Card withBorder padding="md" radius="md">
                  <Text size="sm" fw={600}>General Options</Text>
                  <Text size="xs" c="dimmed" mb="sm">Application broadcast and runtime behavior</Text>

                  <Stack gap="sm">
                    <Box>
                      <Text size="xs" fw={500} mb={4}>Activity Timer Mode</Text>
                      <SegmentedControl
                        value={draft.timeMode}
                        onChange={val => update('timeMode', val as TimeMode)}
                        data={[
                          { label: '⌛ Time Left (Countdown)', value: 'remaining' },
                          { label: '⏱ Time Elapsed (Flight Time)', value: 'elapsed' },
                          { label: 'Hidden', value: 'none' },
                        ]}
                        size="xs"
                        fullWidth
                      />
                      <Text size="11px" c="dimmed" mt={4}>
                        {draft.timeMode === 'remaining'
                          ? 'Shows arrival countdown (e.g. 58:44 left)'
                          : draft.timeMode === 'elapsed'
                          ? 'Shows total duration airborne or logged in (e.g. 1:04:34 elapsed)'
                          : 'No timer shown on your Discord activity'}
                      </Text>
                    </Box>

                    <Divider />

                    <Box>
                      <Text size="xs" fw={500} mb={4}>Smart Mode Airport Display</Text>
                      <SegmentedControl
                        value={draft.airportFormat ?? 'name'}
                        onChange={val => update('airportFormat', val as AirportFormat)}
                        data={[
                          { label: 'City / Name (Glasgow)', value: 'name' },
                          { label: 'ICAO + Name (EGPF (Glasgow))', value: 'both' },
                          { label: 'ICAO (EGPF)', value: 'icao' },
                        ]}
                        size="xs"
                        fullWidth
                      />
                    </Box>

                    <Select
                      label="Approach & Landing Phrase"
                      description="Preset template when on approach or landing"
                      value={draft.approachTemplate ?? 'On Approach to {airport}'}
                      onChange={val => update('approachTemplate', val || 'On Approach to {airport}')}
                      data={[
                        { value: 'On Approach to {airport}', label: 'On Approach to {airport}' },
                        { value: 'On Final for {airport}', label: 'On Final for {airport}' },
                        { value: 'Landing at {airport}', label: 'Landing at {airport}' },
                        { value: 'Inbound to {airport}', label: 'Inbound to {airport}' },
                        { value: 'Arriving at {airport}', label: 'Arriving at {airport}' },
                        { value: 'Descending into {airport}', label: 'Descending into {airport}' },
                      ]}
                      size="xs"
                    />

                    <PasswordInput
                      label="Custom Discord Application ID (Optional)"
                      description="Default ID displays 'SkyStats'. Leave blank to use the built-in private application ID."
                      placeholder="Using built-in private ID"
                      value={draft.discordApplicationId || ''}
                      onChange={e => update('discordApplicationId', e.currentTarget.value.trim())}
                      size="xs"
                    />

                    <Divider />

                    <Switch
                      label="Enable Discord Rich Presence"
                      description="Broadcast live flight activity to Discord"
                      checked={draft.enabled}
                      onChange={e => update('enabled', e.currentTarget.checked)}
                    />
                    <Divider />
                    <Switch
                      label="Minimize to System Tray"
                      description="Keep running when window is closed (X)"
                      checked={draft.minimizeToTray}
                      onChange={e => update('minimizeToTray', e.currentTarget.checked)}
                    />
                  </Stack>
                </Card>
              </SimpleGrid>
            </Stack>
          )}

          {/* =================================================================
              ABOUT
             ================================================================= */}
          {page === 'About' && (
            <Stack gap="lg">
              <div>
                <Title order={3} fw={600}>
                  About SkyStats
                </Title>
                <Text size="xs" c="dimmed" mt={2}>
                  Application version, architecture, and documentation.
                </Text>
              </div>

              <Card withBorder padding="lg" radius="md">
                <Stack gap="md">
                  <Group gap="sm">
                    <SkyStatsMark size={36} />
                    <div>
                      <Title order={4} fw={700}>SkyStats</Title>
                      <Text size="xs" c="dimmed">Version 0.9.0 - Tauri v2 Desktop</Text>
                    </div>
                  </Group>

                  <Text size="xs" c="dimmed" style={{ lineHeight: 1.6 }}>
                    SkyStats fetches live pilot telemetry from the official VATSIM network feed using your pilot CID and publishes real-time status to your local Discord Desktop client. Built with Mantine UI, Rust, and Tauri v2.
                  </Text>

                  <Paper p="sm" withBorder radius="md">
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="xs">
                      <Box>
                        <Text size="10px" fw={700} tt="uppercase" c="dimmed">ARCHITECTURE</Text>
                        <Text size="xs" fw={600}>Local Client-Side</Text>
                      </Box>
                      <Box>
                        <Text size="10px" fw={700} tt="uppercase" c="dimmed">FEED INTERVAL</Text>
                        <Text size="xs" fw={600}>20 seconds</Text>
                      </Box>
                      <Box>
                        <Text size="10px" fw={700} tt="uppercase" c="dimmed">DISCORD LINK</Text>
                        <Text size="xs" fw={600}>Local IPC Socket</Text>
                      </Box>
                      <Box>
                        <Text size="10px" fw={700} tt="uppercase" c="dimmed">LICENSE</Text>
                        <Text size="xs" fw={600}>Open Source (MIT)</Text>
                      </Box>
                    </SimpleGrid>
                  </Paper>

                  <Group gap="md">
                    <Anchor href="https://my.vatsim.net" target="_blank" rel="noreferrer" size="xs" c="blue">
                      <Group gap={4}>
                        <span>VATSIM Portal</span>
                        <ExternalLink size={12} />
                      </Group>
                    </Anchor>
                    <Anchor href="https://discord.com/developers/docs/rich-presence/overview" target="_blank" rel="noreferrer" size="xs" c="blue">
                      <Group gap={4}>
                        <span>Discord RPC Docs</span>
                        <ExternalLink size={12} />
                      </Group>
                    </Anchor>
                    <Anchor href="https://github.com/yani2173/air/blob/main/PRIVACY.md" target="_blank" rel="noreferrer" size="xs" c="blue">
                      <Group gap={4}>
                        <span>Privacy Policy</span>
                        <ExternalLink size={12} />
                      </Group>
                    </Anchor>
                    <Anchor href="https://github.com/yani2173/air/blob/main/TERMS.md" target="_blank" rel="noreferrer" size="xs" c="blue">
                      <Group gap={4}>
                        <span>Terms of Use</span>
                        <ExternalLink size={12} />
                      </Group>
                    </Anchor>
                  </Group>
                </Stack>
              </Card>
            </Stack>
          )}
        </Box>
      </AppShell.Main>

      {/* Floating Global Toast Notification */}
      {(error || notice) && (
        <Box style={{ position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}>
          <Notification
            color={error ? 'red' : 'teal'}
            title={error ? 'Error' : 'Notice'}
            onClose={() => {
              setError('');
              setNotice('');
            }}
          >
            {error || notice}
          </Notification>
        </Box>
      )}

      {/* Setup Wizard Modal */}
      {wizardOpen && (
        <SetupWizard
          settings={draft}
          onChange={setDraft}
          onFinish={() => {
            setWizardOpen(false);
            void save({ ...draft, setupComplete: true });
          }}
        />
      )}
    </AppShell>
  );
}
