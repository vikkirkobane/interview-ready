const React = require('react');
const { View } = require('react-native');

const router = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  canGoBack: jest.fn(() => true),
  navigate: jest.fn(),
  setParams: jest.fn(),
  dismiss: jest.fn(),
  dismissAll: jest.fn(),
  reload: jest.fn(),
  pushHref: jest.fn(),
  replaceHref: jest.fn(),
};

let currentParams = {};
let currentSegments = [];
let currentPathname = '/';

function useRouter() {
  return router;
}

function useLocalSearchParams() {
  return currentParams;
}

function useSegments() {
  return currentSegments;
}

function usePathname() {
  return currentPathname;
}

function useFocusEffect(cb) {
  const ReactLocal = React;
  const { useEffect } = ReactLocal;
  useEffect(() => {
    return cb && cb();
  }, []);
}

function useGlobalSearchParams() {
  return currentParams;
}

function useRootNavigationState() {
  return { key: 'root', index: 0, routes: [] };
}

function useNavigation() {
  return { navigate: jest.fn(), goBack: jest.fn() };
}

function useNavigationContainerRef() {
  return { navigate: jest.fn(), getCurrentRoute: () => ({ name: 'index' }) };
}

function useUnstableGlobalHref() {
  return currentPathname;
}

const Stack = ({ children, ...props }) => React.createElement(View, props, children);
Stack.Screen = ({ children, ...props }) => React.createElement(View, props, children);

const Tabs = ({ children, ...props }) => React.createElement(View, props, children);
Tabs.Screen = ({ children, ...props }) => React.createElement(View, props, children);

const Slot = ({ children, ...props }) => React.createElement(View, props, children);
const Redirect = () => React.createElement(View, null, null);
const Link = ({ children, ...props }) => React.createElement(View, props, children);
const useRouterName = () => 'index';

module.exports = {
  __esModule: true,
  default: { router, Link, Stack, Tabs },
  router,
  useRouter,
  useLocalSearchParams,
  useGlobalSearchParams,
  useSegments,
  usePathname,
  useFocusEffect,
  useRootNavigationState,
  useNavigation,
  useNavigationContainerRef,
  useUnstableGlobalHref,
  useRouterName,
  Stack,
  Tabs,
  Slot,
  Redirect,
  Link,
  ExpoRoot: ({ children, ...props }) => React.createElement(View, props, children),
  // test helpers
  __setMockParams: (params) => { currentParams = params || {}; },
  __setMockSegments: (segments) => { currentSegments = segments || []; },
  __setMockPathname: (p) => { currentPathname = p; },
  __resetMockRouter: () => {
    router.push.mockClear();
    router.replace.mockClear();
    router.back.mockClear();
    router.setParams.mockClear();
    currentParams = {};
  },

};

// Also attach helpers directly to the router object for convenience.
router.__resetMockRouter = () => {
  router.push.mockClear();
  router.replace.mockClear();
  router.back.mockClear();
  router.setParams.mockClear();
  currentParams = {};
};

router.__setMockParams = (params) => { currentParams = params || {}; };
router.__setMockSegments = (segments) => { currentSegments = segments || []; };
router.__setMockPathname = (p) => { currentPathname = p; };
