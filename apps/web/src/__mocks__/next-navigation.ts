export const useRouter = () => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
  pathname: '/',
  query: {},
});

export const usePathname = () => '/';
export const useSearchParams = () => new URLSearchParams();
export const notFound = jest.fn(() => { throw new Error('notFound called'); });
export const redirect = jest.fn();
