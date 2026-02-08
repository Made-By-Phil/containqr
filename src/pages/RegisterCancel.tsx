import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const RegisterCancel = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md p-8 space-y-6 bg-card rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold">Registration Cancelled</h1>
        <p className="text-muted-foreground">
          Your payment was not completed. No charges have been made.
          You can try registering again whenever you're ready.
        </p>
        <div className="flex gap-4 justify-center">
          <Link to="/register">
            <Button>Try Again</Button>
          </Link>
          <Link to="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterCancel;
