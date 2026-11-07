import { HStack, Image, ProgressView, Spacer, Text, VStack } from '@expo/ui/swift-ui';
import { activityBackgroundTint, font, foregroundStyle, monospacedDigit, padding, tint } from '@expo/ui/swift-ui/modifiers';
import { createLiveActivity, type LiveActivityEnvironment } from 'expo-widgets';

// Lock screen + Dynamic Island view of the running session.
// Props travel as JSON, so times are epoch milliseconds.
export type SessionActivityProps = {
  phase: 'focus' | 'break' | 'done';
  startAt: number;
  endAt: number;
  title: string;
  subtitle: string;
  km: number;
  nextName: string;
  progress: number; // 0..1 along the whole route
};

export const SessionActivity = createLiveActivity(
  'SessionActivity',
  (props: SessionActivityProps, _env: LiveActivityEnvironment) => {
    'widget';
    // Constants must live inside the widget component (it runs in an isolated runtime).
    const TEAL = '#4fc0b2';
    const CREAM = '#f7fbfd';
    const MUTED = '#9cafbb';

    const timer = (size: number) =>
      props.phase === 'done' ? (
        <Text modifiers={[font({ size, weight: 'bold', design: 'rounded' }), foregroundStyle(TEAL)]}>✓</Text>
      ) : (
        <Text
          timerInterval={{ lower: new Date(props.startAt), upper: new Date(props.endAt) }}
          countsDown
          modifiers={[font({ size, weight: 'bold', design: 'rounded' }), monospacedDigit(), foregroundStyle(CREAM)]}
        />
      );

    const bird = (size: number) => (
      <Image systemName={props.phase === 'break' ? 'bird.fill' : 'bird'} size={size} color={TEAL} />
    );

    return {
      banner: (
        <VStack alignment="leading" spacing={10} modifiers={[padding({ all: 16 }), activityBackgroundTint('#1d2830')]}>
          <HStack spacing={12}>
            {bird(26)}
            <VStack alignment="leading" spacing={2}>
              <Text modifiers={[font({ size: 16, weight: 'bold', design: 'rounded' }), foregroundStyle(CREAM)]}>{props.title}</Text>
              <Text modifiers={[font({ size: 13 }), foregroundStyle(MUTED)]}>{props.subtitle}</Text>
            </VStack>
            <Spacer />
            {timer(34)}
          </HStack>
          <ProgressView value={props.progress} modifiers={[tint(TEAL)]} />
          <HStack>
            <Text modifiers={[font({ size: 12 }), monospacedDigit(), foregroundStyle(MUTED)]}>{`${props.km.toLocaleString('en-US')} km`}</Text>
            <Spacer />
            <Text modifiers={[font({ size: 12 }), foregroundStyle(MUTED)]}>{`Next: ${props.nextName}`}</Text>
          </HStack>
        </VStack>
      ),
      compactLeading: bird(16),
      compactTrailing: timer(15),
      minimal: bird(14),
      expandedLeading: (
        <HStack spacing={8} modifiers={[padding({ leading: 4 })]}>
          {bird(22)}
          <Text modifiers={[font({ size: 15, weight: 'bold', design: 'rounded' }), foregroundStyle(CREAM)]}>{props.title}</Text>
        </HStack>
      ),
      expandedTrailing: timer(28),
      expandedBottom: (
        <VStack alignment="leading" spacing={6}>
          <Text modifiers={[font({ size: 13 }), foregroundStyle(MUTED)]}>{props.subtitle}</Text>
          <ProgressView value={props.progress} modifiers={[tint(TEAL)]} />
        </VStack>
      ),
    };
  },
);
