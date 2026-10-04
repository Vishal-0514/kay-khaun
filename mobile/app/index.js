import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { homeRouteFor } from '../lib/session';

export default function Index() {
  const user = useAuthStore((s) => s.user);
  return <Redirect href={user ? homeRouteFor(user) : '/welcome'} />;
}
