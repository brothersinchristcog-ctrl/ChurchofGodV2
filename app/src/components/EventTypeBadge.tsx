import React from 'react';
import { View, Text } from 'react-native';
import { radius } from '../theme/Theme';
import { EventType } from '../types/event';

const badgeConfig: Record<EventType, { bg: string; text: string; label: string }> = {
  worship:  { bg: '#E6F1FB', text: '#0C447C', label: 'Worship'  },
  prayer:   { bg: '#E1F5EE', text: '#085041', label: 'Prayer'   },
  meeting:  { bg: '#FAEEDA', text: '#633806', label: 'Meeting'  },
  outreach: { bg: '#FBEAF0', text: '#72243E', label: 'Outreach' },
  funeral:  { bg: '#F1EFE8', text: '#444441', label: 'Funeral'  },
};

export const EventTypeBadge = ({ type }: { type: EventType }) => {
  const cfg = badgeConfig[type] || badgeConfig['worship'];
  return (
    <View style={{ backgroundColor: cfg.bg, borderRadius: radius.full,
                   paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: cfg.text }}>{cfg.label}</Text>
    </View>
  );
};

export default EventTypeBadge;
