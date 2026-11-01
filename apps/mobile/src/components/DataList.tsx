import React from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { getTheme } from '../theme/colors';

export function DataList<T>({
  data,
  keyExtractor,
  renderItem,
  refreshing,
  onRefresh,
  emptyMessage,
  ListHeaderComponent,
}: {
  data: T[];
  keyExtractor: (item: T, index?: number) => string;
  renderItem: (item: T) => React.ReactElement;
  refreshing?: boolean;
  onRefresh?: () => void;
  emptyMessage: string;
  ListHeaderComponent?: React.ReactElement;
}) {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const theme = getTheme(scheme);

  return (
    <FlatList
      data={data}
      keyExtractor={(item, index) => keyExtractor(item, index)}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} />
        ) : undefined
      }
      ListHeaderComponent={ListHeaderComponent}
      ListEmptyComponent={
        <Text style={[styles.empty, { color: theme.colors.textMuted }]}>
          {emptyMessage}
        </Text>
      }
      renderItem={({ item }) => (
        <View style={[styles.row, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          {renderItem(item)}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  empty: { textAlign: 'center', padding: 32 },
});
