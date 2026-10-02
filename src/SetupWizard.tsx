import { useState } from 'react';
import {
  Modal,
  Stepper,
  Button,
  Group,
  Stack,
  Text,
  Title,
  TextInput,
  Paper,
  Card,
  Anchor,
  ThemeIcon,
  Badge,
} from '@mantine/core';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ExternalLink,
  Shield,
  Radio,
} from 'lucide-react';
import type { Settings } from './types';
import { presets } from './types';
import { SkyStatsMark } from './components/SkyStatsLogo';

export default function SetupWizard({
  settings,
  onChange,
  onFinish,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
  onFinish: () => void;
}) {
  const [active, setActive] = useState(0);

  const change = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value });

  const totalSteps = 4;

  const nextStep = () => {
    if (active < totalSteps - 1) {
      setActive(current => current + 1);
    } else {
      onFinish();
    }
  };

  const prevStep = () => setActive(current => (current > 0 ? current - 1 : current));

  return (
    <Modal
      opened={true}
      onClose={onFinish}
      size="lg"
      centered
      radius="md"
      withCloseButton={false}
      padding="xl"
      title={
        <Group gap="xs">
          <SkyStatsMark size={24} />
          <div>
            <Text fw={600} size="sm" c="bright">
              SkyStats Setup Assistant
            </Text>
            <Text size="xs" c="dimmed">
              Initial configuration
            </Text>
          </div>
        </Group>
      }
    >
      <Stack gap="lg" mt="xs">
        <Stepper active={active} onStepClick={setActive} size="xs" allowNextStepsSelect={false}>
          <Stepper.Step label="Welcome" description="Overview" />
          <Stepper.Step label="Pilot CID" description="VATSIM" />
          <Stepper.Step label="Discord" description="Connection" />
          <Stepper.Step label="Preset" description="Format" />
        </Stepper>

        {/* Step 0: Welcome */}
        {active === 0 && (
          <Stack gap="md">
            <div>
              <Title order={4} fw={600}>
                Welcome to SkyStats
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                SkyStats tracks your active VATSIM flight telemetry and broadcasts rich presence to your Discord profile in real time.
              </Text>
            </div>

            <Paper p="md" withBorder radius="md">
              <Stack gap="sm">
                <Group gap="sm" wrap="nowrap">
                  <ThemeIcon size="sm" variant="light" color="blue">
                    <CheckCircle2 size={14} />
                  </ThemeIcon>
                  <Text size="xs">
                    Works seamlessly with Microsoft Flight Simulator, X-Plane, and Prepar3D
                  </Text>
                </Group>
                <Group gap="sm" wrap="nowrap">
                  <ThemeIcon size="sm" variant="light" color="blue">
                    <Shield size={14} />
                  </ThemeIcon>
                  <Text size="xs">
                    100% local processing directly with Discord Desktop on your PC
                  </Text>
                </Group>
                <Group gap="sm" wrap="nowrap">
                  <ThemeIcon size="sm" variant="light" color="blue">
                    <Radio size={14} />
                  </ThemeIcon>
                  <Text size="xs">
                    Real-time flight level, ground speed, route tracking, and remaining time
                  </Text>
                </Group>
              </Stack>
            </Paper>
          </Stack>
        )}

        {/* Step 1: VATSIM CID */}
        {active === 1 && (
          <Stack gap="md">
            <div>
              <Title order={4} fw={600}>
                Enter Your VATSIM Pilot CID
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                Your Certificate ID links your active flight plan and radar telemetry to Discord.
              </Text>
            </div>

            <TextInput
              label="VATSIM Certificate ID"
              description="6-7 digit identifier assigned by VATSIM"
              placeholder="e.g. 1234567"
              value={settings.cid}
              onChange={e => change('cid', e.currentTarget.value.replace(/\D/g, ''))}
              autoFocus
              size="sm"
            />

            <Group justify="space-between">
              <Anchor
                href="https://my.vatsim.net"
                target="_blank"
                rel="noreferrer"
                size="xs"
                c="blue"
              >
                <Group gap={4}>
                  <span>Look up your CID on my.vatsim.net</span>
                  <ExternalLink size={12} />
                </Group>
              </Anchor>
              <Text size="xs" c="dimmed">
                (Optional - can be updated anytime)
              </Text>
            </Group>
          </Stack>
        )}

        {/* Step 2: Discord Setup */}
        {active === 2 && (
          <Stack gap="md">
            <div>
              <Title order={4} fw={600}>
                Discord Desktop Integration
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                SkyStats broadcasts via local IPC socket directly to Discord Desktop on your machine.
              </Text>
            </div>

            <Paper p="md" withBorder radius="md">
              <Group justify="space-between" align="center">
                <div>
                  <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                    Discord Rich Presence
                  </Text>
                  <Text size="sm" fw={600} mt={2}>
                    Built-in & Ready
                  </Text>
                  <Text size="xs" c="dimmed" mt={2}>
                    Pre-configured for SkyStats Rich Presence. No manual developer setup required.
                  </Text>
                </div>
                <Badge color="teal" variant="light">Connected</Badge>
              </Group>
            </Paper>

            <Text size="xs" c="dimmed">
              Note: Keep Discord Desktop running while flying so your profile presence displays your flight status.
            </Text>
          </Stack>
        )}

        {/* Step 3: Presets */}
        {active === 3 && (
          <Stack gap="md">
            <div>
              <Title order={4} fw={600}>
                Choose a Presence Layout
              </Title>
              <Text size="sm" c="dimmed" mt={4}>
                Select how your flight status will appear on your Discord profile. You can tweak individual fields anytime in the designer.
              </Text>
            </div>

            <Stack gap="xs">
              {(Object.keys(presets) as (keyof typeof presets)[]).map(name => {
                const isSelected = settings.preset === name;
                return (
                  <Card
                    key={name}
                    withBorder
                    padding="sm"
                    radius="md"
                    onClick={() =>
                      onChange({
                        ...settings,
                        ...presets[name],
                        preset: name,
                      })
                    }
                    style={{
                      cursor: 'pointer',
                      borderColor: isSelected ? 'var(--mantine-color-blue-6)' : undefined,
                      backgroundColor: isSelected ? 'var(--mantine-color-blue-light)' : undefined,
                    }}
                  >
                    <Group justify="space-between">
                      <Stack gap={2}>
                        <Group gap="xs">
                          <Text size="sm" fw={600}>
                            {name}
                          </Text>
                          {isSelected && (
                            <Badge size="xs" variant="filled" color="blue">
                              Selected
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" ff="monospace" c="dimmed">
                          {presets[name].stateTemplate}
                        </Text>
                      </Stack>
                      {isSelected && (
                        <ThemeIcon size="sm" radius="xl" color="blue">
                          <Check size={12} strokeWidth={3} />
                        </ThemeIcon>
                      )}
                    </Group>
                  </Card>
                );
              })}
            </Stack>
          </Stack>
        )}

        {/* Modal Controls Footer */}
        <Group justify="space-between" mt="md" pt="sm" style={{ borderTop: '1px solid var(--mantine-color-dark-4)' }}>
          <Button
            variant="default"
            size="xs"
            disabled={active === 0}
            onClick={prevStep}
            leftSection={<ArrowLeft size={14} />}
          >
            Back
          </Button>

          <Button
            variant="filled"
            color="blue"
            size="xs"
            onClick={nextStep}
            rightSection={<ArrowRight size={14} />}
          >
            {active === totalSteps - 1 ? 'Finish Setup' : 'Continue'}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
