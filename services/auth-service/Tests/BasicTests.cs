using Xunit;

namespace AuthService.Tests;

public class BasicTests
{
    [Fact]
    public void Test_Basic_Assertion()
    {
        // Basic test to ensure test framework is working
        Assert.True(true);
    }

    [Fact]
    public void Test_Math_Operation()
    {
        // Simple math test
        var result = 2 + 2;
        Assert.Equal(4, result);
    }
}