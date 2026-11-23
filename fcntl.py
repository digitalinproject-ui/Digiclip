"""Windows compatibility shim for Unix fcntl module."""
import sys

LOCK_SH = 1
LOCK_EX = 2
LOCK_NB = 4
LOCK_UN = 8

if sys.platform == "win32":
    import msvcrt
    import os

    def flock(fd, operation):
        """Emulate flock using msvcrt.locking on Windows."""
        try:
            fileno = fd if isinstance(fd, int) else fd.fileno()
        except Exception:
            return

        mode = msvcrt.LK_LOCK
        if operation & LOCK_UN:
            mode = msvcrt.LK_UNLCK
        elif operation & LOCK_NB:
            mode = msvcrt.LK_NBLCK
        else:
            mode = msvcrt.LK_LOCK

        try:
            curr = os.lseek(fileno, 0, os.SEEK_CUR)
            os.lseek(fileno, 0, os.SEEK_SET)
            try:
                msvcrt.locking(fileno, mode, 1)
            finally:
                os.lseek(fileno, curr, os.SEEK_SET)
        except (OSError, IOError) as err:
            if operation & LOCK_NB:
                raise BlockingIOError(f"Resource temporarily unavailable: {err}") from err
            # Silently pass or ignore unlock errors if already unlocked
            if operation & LOCK_UN:
                return
            raise

    def fcntl(fd, op, arg=0):
        return 0

    def ioctl(fd, op, arg=0, mutable_flag=True):
        return 0
